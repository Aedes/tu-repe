import fs from "fs"
import os from "os"
import path from "path"
import { execFile } from "child_process"
import { promisify } from "util"
import { IngestionJobRepository } from "../repositories/IngestionJobRepository"
import { CourtService } from "./CourtService"
import { B2Service } from "./B2Service"
import { VideoService } from "./VideoService"
import { extractMetadataFromFileName } from "../utils/extractMetadataFromFileName"
import { parseDurationSeconds, probeMedia } from "../utils/ffprobe"
import { pool } from "../config/db"
import { logger } from "../logger"
import { config } from "../config/config"
import { FailedUploadService } from "./FailedUploadService"
import { IIngestionJob } from "../types"

const MAX_ATTEMPTS = 10
const MIN_FALLBACK_DURATION_SECONDS = 1
const FFMPEG_REMUX_TIMEOUT_MS = 300_000
const execFileAsync = promisify(execFile)

const estimateDurationFromFileMtime = (filePath: string, startTime: Date): number | null => {
    const stat = fs.statSync(filePath)
    const elapsedSeconds = Math.ceil((stat.mtime.getTime() - startTime.getTime()) / 1000)
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < MIN_FALLBACK_DURATION_SECONDS) {
        return null
    }
    return Math.min(elapsedSeconds, config.VIDEO_CHUNK_DURATION_SECONDS)
}

export class IngestionService {
    private static readonly jobs = new IngestionJobRepository()
    private static processing = false

    static async registerFile(filePath: string) {
        if (!filePath.endsWith(".mp4")) return
        const fileName = path.basename(filePath)
        const metadata = extractMetadataFromFileName(fileName)
        if (!metadata) {
            logger.warn({ fileName }, "ingestion_invalid_filename")
            return
        }
        const court = await CourtService.findCourtById(metadata.courtId)
        if (!court) {
            logger.warn({ courtId: metadata.courtId }, "ingestion_court_missing")
            return
        }
        let duration: number
        try {
            duration = parseDurationSeconds(await probeMedia(filePath))
        } catch (error) {
            const estimatedDuration = estimateDurationFromFileMtime(filePath, metadata.startTime)
            if (!estimatedDuration) {
                logger.warn({ err: error, fileName }, "ingestion_probe_failed_skipping")
                return
            }
            duration = estimatedDuration
            logger.warn({ err: error, fileName, duration }, "ingestion_probe_failed_using_file_mtime")
        }
        const endTime = new Date(metadata.startTime.getTime() + duration * 1000)
        logger.info({ fileName }, "ingestion_queued")
        await this.jobs.upsertPending({
            filePath,
            fileName,
            clubId: court.clubId,
            courtId: court.id!,
            startTime: metadata.startTime,
            endTime,
        })
    }

    static async processNext(): Promise<boolean> {
        if (this.processing) return false
        const job = await this.jobs.claimNext()
        if (!job?.id) return false
        this.processing = true
        try {
            await this.processJob(job.id, job)
            return true
        } finally {
            this.processing = false
        }
    }

    private static async processJob(id: number, job: IIngestionJob) {
        if (!job) return
        let preparedUploadDir: string | undefined
        try {
            if (!fs.existsSync(job.filePath) && job.status !== "uploaded") {
                await this.jobs.markRetry(id, "Archivo local ausente", job.attemptsCount + 1, job.attemptsCount + 1 >= MAX_ATTEMPTS)
                logger.error({ jobId: id }, "ingestion_missing_file")
                return
            }

            let b2FilePath = job.b2FilePath
            if (job.status !== "uploaded" || !b2FilePath) {
                const uploadFilePath = await this.prepareUploadFile(job.filePath)
                if (uploadFilePath !== job.filePath) preparedUploadDir = path.dirname(uploadFilePath)
                b2FilePath = await B2Service.uploadFileAndGetFilePath(
                    uploadFilePath,
                    job.clubId,
                    job.courtId,
                    job.fileName
                )
                await this.jobs.update(id, { b2FilePath, status: "uploaded" })
            }

            const connection = await pool.getConnection()
            try {
                await connection.beginTransaction()
                await VideoService.createVideo({
                    courtId: job.courtId,
                    fileName: job.fileName,
                    b2FilePath: b2FilePath!,
                    startTime: new Date(job.startTime),
                    endTime: new Date(job.endTime),
                }, connection)
                await this.jobs.update(id, { status: "completed", lockedAt: null }, connection)
                await connection.commit()
            } catch (error) {
                await connection.rollback()
                throw error
            } finally {
                connection.release()
            }

            logger.info({ fileName: job.fileName }, "ingestion_completed")
            try {
                if (fs.existsSync(job.filePath)) fs.unlinkSync(job.filePath)
            } catch (error) {
                logger.warn({ err: error, filePath: job.filePath }, "ingestion_unlink_failed")
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "ingestion_failed"
            const attempts = job.attemptsCount + 1
            await this.jobs.markRetry(id, message, attempts, attempts >= MAX_ATTEMPTS)
            logger.error({ err: error, jobId: id, attempts }, "ingestion_job_failed")
        } finally {
            if (preparedUploadDir) {
                await fs.promises.rm(preparedUploadDir, { recursive: true, force: true })
            }
        }
    }

    private static async prepareUploadFile(filePath: string): Promise<string> {
        if (config.isTest) return filePath
        const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "tu-repe-ingest-"))
        const outputPath = path.join(tempDir, path.basename(filePath))
        try {
            await execFileAsync("ffmpeg", [
                "-y",
                "-i", filePath,
                "-c", "copy",
                "-movflags", "+faststart",
                outputPath,
            ], { timeout: FFMPEG_REMUX_TIMEOUT_MS, env: { ...process.env, TZ: "UTC" } })
            parseDurationSeconds(await probeMedia(outputPath))
            return outputPath
        } catch (error) {
            await fs.promises.rm(tempDir, { recursive: true, force: true })
            throw error
        }
    }

    static async migrateFailedUploads() {
        const pending = await FailedUploadService.getPendingAndRetrying()
        for (const item of pending) {
            const metadata = extractMetadataFromFileName(item.fileName)
            await this.jobs.upsertPending({
                filePath: item.filePath,
                fileName: item.fileName,
                clubId: item.clubId,
                courtId: item.courtId,
                startTime: metadata?.startTime || new Date(item.endTime.getTime() - config.VIDEO_CHUNK_DURATION_SECONDS * 1000),
                endTime: item.endTime,
            })
        }
    }

    static async reconcile() {
        const scanDir = (dir: string) => {
            if (!fs.existsSync(dir)) return
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name)
                if (entry.isDirectory()) scanDir(full)
                else if (entry.name.endsWith(".mp4")) {
                    const ageMs = Date.now() - fs.statSync(full).mtimeMs
                    if (ageMs < config.STABILITY_THRESHOLD_MS) continue
                    void this.registerFile(full)
                }
            }
        }
        scanDir(config.VIDEO_DIR)

        const incomplete = await this.jobs.findIncomplete()
        for (const job of incomplete) {
            if (!fs.existsSync(job.filePath) && job.status !== "uploaded") {
                logger.error({ jobId: job.id, filePath: job.filePath }, "ingestion_reconcile_missing_file")
            }
        }

        const permanent = await this.jobs.findFailedPermanent()
        if (permanent.length) {
            logger.error({ count: permanent.length }, "ingestion_permanent_failures")
        }
    }
}
