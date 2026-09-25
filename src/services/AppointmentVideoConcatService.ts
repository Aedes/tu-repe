import fs from "fs"
import path from "path"
import { spawn, ChildProcess } from "child_process"
import { config } from "../config/config"
import { logger } from "../logger"
import { B2Service } from "./B2Service"
import { AppointmentMergeError } from "../errors/AppointmentMergeError"
import { parseDurationSeconds, probeMedia } from "../utils/ffprobe"
import { encodeMergeSignature, mergeSignatureFromProbe } from "./mergeSignature"
import { AppointmentProcessingStep } from "../types"

type Source = { b2FilePath: string }

export class AppointmentVideoConcatService {
    private static child: ChildProcess | null = null
    private static aborted = false

    static abort() {
        this.aborted = true
        if (!this.child) return
        this.child.kill("SIGTERM")
        const child = this.child
        setTimeout(() => {
            if (!child.killed) child.kill("SIGKILL")
        }, 3_000).unref()
    }

    static cleanupStale(maxAgeMs: number) {
        const root = path.join(config.VIDEO_DIR, "appointment-merges")
        if (!fs.existsSync(root)) return
        const now = Date.now()
        for (const name of fs.readdirSync(root)) {
            const full = path.join(root, name)
            try {
                const stat = fs.statSync(full)
                if (now - stat.mtimeMs > maxAgeMs) fs.rmSync(full, { recursive: true, force: true })
            } catch (error) {
                logger.warn({ err: error, full }, "appointment_merge_cleanup_failed")
            }
        }
    }

    static async concat(input: {
        clubId: number
        courtId: number
        cacheKey: string
        sources: Source[]
        onStep?: (step: AppointmentProcessingStep) => Promise<void>
    }): Promise<{ b2FilePath: string; bytes: number }> {
        this.aborted = false
        const root = path.join(config.VIDEO_DIR, "appointment-merges")
        await fs.promises.mkdir(root, { recursive: true })
        const tempDir = await fs.promises.mkdtemp(path.join(root, "job-"))
        try {
            await this.assertDisk(tempDir, input.sources)
            this.assertNotAborted()
            await input.onStep?.("downloading")
            const files = await this.downloadSources(tempDir, input.sources)
            this.assertNotAborted()
            await input.onStep?.("validating")
            const expectedDuration = await this.assertCompatible(tempDir, files)
            await input.onStep?.("concatenating")
            const outputPath = path.join(tempDir, "output.mp4")
            await this.runFfmpeg(tempDir, outputPath)
            await this.assertOutput(outputPath, expectedDuration)
            this.assertNotAborted()
            await input.onStep?.("uploading")
            const b2FilePath = `club_${input.clubId}/court_${input.courtId}/appointments/${input.cacheKey}.mp4`
            await B2Service.uploadFile(outputPath, b2FilePath)
            const bytes = (await fs.promises.stat(outputPath)).size
            return { b2FilePath, bytes }
        } finally {
            this.child = null
            await fs.promises.rm(tempDir, { recursive: true, force: true })
        }
    }

    private static assertNotAborted() {
        if (this.aborted) throw new AppointmentMergeError("ABORTED", "Unión cancelada", false)
    }

    private static async assertDisk(directory: string, sources: Source[]) {
        let total = 0
        for (const source of sources) {
            total += await B2Service.getObjectSize(source.b2FilePath)
        }
        const stats = await fs.promises.statfs(directory)
        const free = stats.bavail * stats.bsize
        const required = total * 2 + config.APPOINTMENT_MERGE_DISK_MARGIN_BYTES
        if (free < required) {
            throw new AppointmentMergeError("DISK_FULL", "No hay espacio suficiente para unir el partido", false)
        }
    }

    private static async downloadSources(tempDir: string, sources: Source[]) {
        const files: string[] = []
        for (let index = 0; index < sources.length; index += 1) {
            this.assertNotAborted()
            const fileName = `${String(index).padStart(3, "0")}.mp4`
            const destination = path.join(tempDir, fileName)
            try {
                await B2Service.downloadToFile(sources[index].b2FilePath, destination)
            } catch (error) {
                if (this.aborted || (error instanceof AppointmentMergeError && error.code === "ABORTED")) {
                    throw new AppointmentMergeError("ABORTED", "Unión cancelada", false)
                }
                throw new AppointmentMergeError("B2_DOWNLOAD", error instanceof Error ? error.message : "download_failed", false)
            }
            files.push(fileName)
        }
        return files
    }

    private static async assertCompatible(tempDir: string, fileNames: string[]) {
        let expected: string | null = null
        let duration = 0
        for (const fileName of fileNames) {
            let probe
            try {
                probe = await probeMedia(path.join(tempDir, fileName))
            } catch (error) {
                throw new AppointmentMergeError("FFPROBE_FAILED", error instanceof Error ? error.message : "ffprobe_failed", false)
            }
            const signature = mergeSignatureFromProbe(probe)
            if (!signature) {
                throw new AppointmentMergeError("INCOMPATIBLE_SEGMENTS", "Fragmento sin video compatible", true)
            }
            const encoded = encodeMergeSignature(signature)
            if (expected && expected !== encoded) {
                throw new AppointmentMergeError("INCOMPATIBLE_SEGMENTS", "Los fragmentos no se pueden unir sin recodificar", true)
            }
            expected = encoded
            duration += parseDurationSeconds(probe)
        }
        return duration
    }

    private static runFfmpeg(tempDir: string, outputPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const names = fs.readdirSync(tempDir).filter((name) => /^\d{3}\.mp4$/.test(name)).sort()
            const listPath = path.join(tempDir, "concat.txt")
            fs.writeFileSync(listPath, names.map((name) => `file '${name}'`).join("\n"))
            const child = spawn("ffmpeg", [
                "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", "concat.txt",
                "-c", "copy",
                "-movflags", "+faststart",
                "output.mp4",
            ], { cwd: tempDir, env: { ...process.env, TZ: "UTC" } })
            this.child = child
            let stderr = ""
            let settled = false
            const finish = (error?: Error) => {
                if (settled) return
                settled = true
                clearTimeout(timer)
                if (error) reject(error)
                else resolve()
            }
            const timer = setTimeout(() => {
                child.kill("SIGTERM")
                setTimeout(() => {
                    if (!child.killed) child.kill("SIGKILL")
                }, 3_000).unref()
                logger.warn({ stderr: stderr.slice(-500) }, "appointment_merge_timeout")
                finish(new AppointmentMergeError("TIMEOUT", "Timeout al unir el partido", false))
            }, config.APPOINTMENT_MERGE_FFMPEG_TIMEOUT_MS)

            child.stderr.on("data", (chunk: Buffer) => {
                stderr = (stderr + chunk.toString()).slice(-4_000)
            })
            child.on("error", (error) => {
                finish(new AppointmentMergeError("FFMPEG_FAILED", error.message, false))
            })
            child.on("exit", (code) => {
                if (this.aborted) {
                    finish(new AppointmentMergeError("ABORTED", "Unión cancelada", false))
                    return
                }
                if (code === 0 && fs.existsSync(outputPath)) finish()
                else {
                    logger.warn({ code, stderr: stderr.slice(-500) }, "appointment_merge_ffmpeg_failed")
                    finish(new AppointmentMergeError("FFMPEG_FAILED", "ffmpeg no pudo unir los fragmentos", false))
                }
            })
        })
    }

    private static async assertOutput(outputPath: string, expectedDuration: number) {
        const stat = await fs.promises.stat(outputPath)
        if (stat.size <= 0) {
            throw new AppointmentMergeError("OUTPUT_INVALID", "El video unido está vacío", false)
        }
        const probe = await probeMedia(outputPath)
        if (!probe.streams?.some((stream) => stream.codec_type === "video")) {
            throw new AppointmentMergeError("OUTPUT_INVALID", "El video unido no contiene video", false)
        }
        const duration = parseDurationSeconds(probe)
        const tolerance = Math.max(5, expectedDuration * 0.02)
        if (Math.abs(duration - expectedDuration) > tolerance) {
            throw new AppointmentMergeError("OUTPUT_INVALID", "La duración del video unido no coincide", false)
        }
    }
}
