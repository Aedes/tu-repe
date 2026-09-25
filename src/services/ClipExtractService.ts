import fs from "fs"
import path from "path"
import { spawn, ChildProcess } from "child_process"
import { config } from "../config/config"
import { logger } from "../logger"
import { AppError } from "../errors/AppError"
import { B2Service } from "./B2Service"
import { CourtService } from "./CourtService"
import { VideoService } from "./VideoService"
import { VideoRepository } from "../repositories/VideoRepository"
import { parseDurationSeconds, parseFps, probeMedia } from "../utils/ffprobe"
import { ClipSegmentError, planClipSegments, PlannedClipSegment } from "./clipSegments"

const RANGE_SLACK_MS = 5
const MAX_OUTPUT_SECONDS = 30.5
const KILL_GRACE_MS = 3_000
const SILENT_AUDIO = "anullsrc=channel_layout=stereo:sample_rate=48000"
const AUDIO_ENCODE = ["-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "128k"]
const VIDEO_ENCODE = [
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-pix_fmt", "yuv420p",
    "-g", "30",
    "-keyint_min", "30",
    "-sc_threshold", "0",
]

export type ClipExtractCode =
    | "INVALID_CLIP_RANGE"
    | "CLIP_NOT_FOUND"
    | "CLIP_COVERAGE_GAP"
    | "CLIP_QUEUE_FULL"
    | "CLIP_DISK_FULL"
    | "CLIP_PROCESSING_TIMEOUT"
    | "CLIP_PROCESSING_FAILED"

export class ClipExtractError extends Error {
    constructor(readonly code: ClipExtractCode) {
        super(code)
        this.name = "ClipExtractError"
    }
}

export type ClipExtractInput = {
    clubUrlId: string
    courtPublicId: string
    appointmentStart: Date
    offsetMs: number
    durationMs: number
}

export type ClipExtractResult = {
    outputPath: string
    cleanup: () => Promise<void>
}

class SerialQueue {
    private waiters = 0
    private chain: Promise<unknown> = Promise.resolve()

    enqueue<T>(work: () => Promise<T>): Promise<T> {
        if (this.waiters >= config.CLIP_MAX_WAITERS) {
            return Promise.reject(new ClipExtractError("CLIP_QUEUE_FULL"))
        }
        this.waiters += 1
        const run = this.chain.then(work)
        this.chain = run.then(() => undefined, () => undefined)
        return run.finally(() => {
            this.waiters -= 1
        })
    }
}

const queue = new SerialQueue()

const seconds = (ms: number) => (ms / 1000).toFixed(3)

const concatLine = (name: string) => `file '${name.replace(/'/g, "'\\''")}'`

export class ClipExtractService {
    private static readonly videos = new VideoRepository()
    private static child: ChildProcess | null = null

    static extract(input: ClipExtractInput): Promise<ClipExtractResult> {
        return queue.enqueue(() => this.perform(input))
    }

    static cleanupStale(maxAgeMs = 60 * 60 * 1000) {
        const root = path.join(config.UPLOAD_DIR, "clips")
        if (!fs.existsSync(root)) return
        const now = Date.now()
        for (const name of fs.readdirSync(root)) {
            const full = path.join(root, name)
            try {
                const stat = fs.statSync(full)
                if (now - stat.mtimeMs > maxAgeMs) fs.rmSync(full, { recursive: true, force: true })
            } catch (error) {
                logger.warn({ err: error instanceof Error ? error.name : "cleanup" }, "clip_extract_cleanup_failed")
            }
        }
    }

    private static async perform(input: ClipExtractInput): Promise<ClipExtractResult> {
        const root = path.join(config.UPLOAD_DIR, "clips")
        await fs.promises.mkdir(root, { recursive: true })
        const tempDir = await fs.promises.mkdtemp(path.join(root, "clip-"))
        let cleaned = false
        const cleanup = async () => {
            if (cleaned) return
            cleaned = true
            this.child = null
            await fs.promises.rm(tempDir, { recursive: true, force: true })
        }

        let courtId = 0
        let clubId = 0
        try {
            const prepared = await this.prepare(input)
            courtId = prepared.courtId
            clubId = prepared.clubId
            const outputPath = await this.runBounded(() => this.render(tempDir, prepared.segments, prepared.courtId, prepared.clubId))
            logger.info({
                courtId,
                clubId,
                durationMs: input.durationMs,
                sources: prepared.segments.length,
            }, "clip_extract_completed")
            return { outputPath, cleanup }
        } catch (error) {
            await cleanup()
            if (error instanceof ClipExtractError || error instanceof AppError) {
                if (error instanceof ClipExtractError) {
                    logger.warn({ courtId, clubId, code: error.code, durationMs: input.durationMs }, "clip_extract_failed")
                }
                throw error
            }
            logger.warn({ courtId, clubId, code: "CLIP_PROCESSING_FAILED", durationMs: input.durationMs }, "clip_extract_failed")
            throw new ClipExtractError("CLIP_PROCESSING_FAILED")
        }
    }

    private static async prepare(input: ClipExtractInput) {
        const courtId = await CourtService.resolveCourtId(input.courtPublicId)
        const context = await VideoService.resolveAppointmentContext(input.appointmentStart, courtId, input.clubUrlId)
        this.assertDuration(input.durationMs)
        if (!Number.isInteger(input.offsetMs)) throw new ClipExtractError("INVALID_CLIP_RANGE")
        const videos = await this.videos.findAvailableOverlapping(courtId, input.appointmentStart, context.endTime)
        const sources = videos.flatMap((video) => {
            if (!video.id) return []
            return [{
                id: video.id,
                b2FilePath: video.b2FilePath,
                startTime: new Date(video.startTime),
                endTime: new Date(video.endTime),
            }]
        })
        if (sources.length === 0) throw new ClipExtractError("CLIP_NOT_FOUND")
        const mediaStart = Math.min(...sources.map((source) => source.startTime.getTime()))
        const mediaEnd = Math.max(...sources.map((source) => source.endTime.getTime()))
        const clipStartMs = input.appointmentStart.getTime() + input.offsetMs
        const clipEndMs = clipStartMs + input.durationMs
        if (clipStartMs < mediaStart - RANGE_SLACK_MS || clipEndMs > mediaEnd + RANGE_SLACK_MS) {
            throw new ClipExtractError("INVALID_CLIP_RANGE")
        }
        const clipStart = new Date(clipStartMs)
        const clipEnd = new Date(clipEndMs)
        let segments: PlannedClipSegment[]
        try {
            segments = planClipSegments(sources, clipStart, clipEnd, config.CLIP_COVERAGE_TOLERANCE_MS)
        } catch (error) {
            if (error instanceof ClipSegmentError) throw new ClipExtractError(error.code)
            throw error
        }
        this.assertKeys(segments, context.court.clubId, courtId)
        return { courtId, clubId: context.court.clubId, segments }
    }

    private static assertDuration(durationMs: number) {
        if (!Number.isInteger(durationMs) || durationMs < config.CLIP_MIN_DURATION_MS || durationMs > config.CLIP_MAX_DURATION_MS) {
            throw new ClipExtractError("INVALID_CLIP_RANGE")
        }
    }

    private static assertKeys(segments: PlannedClipSegment[], clubId: number, courtId: number) {
        const prefix = `club_${clubId}/court_${courtId}/`
        for (const segment of segments) {
            const key = segment.b2FilePath
            if (!key.startsWith(prefix) || key.includes("..") || key.includes("\\") || key.includes("\0")) {
                logger.warn({ videoId: segment.videoId, courtId, clubId, code: "CLIP_PROCESSING_FAILED" }, "clip_extract_path_rejected")
                throw new ClipExtractError("CLIP_PROCESSING_FAILED")
            }
        }
    }

    private static async render(tempDir: string, segments: PlannedClipSegment[], courtId: number, clubId: number) {
        await this.assertDisk(tempDir, segments)
        const localFiles = await this.downloadSources(tempDir, segments)
        const outputPath = path.join(tempDir, "clip.mp4")
        if (segments.length === 1) {
            await this.encodeSegment(localFiles.get(segments[0].b2FilePath)!, segments[0], outputPath)
        } else {
            const names: string[] = []
            for (let index = 0; index < segments.length; index += 1) {
                const name = `seg-${String(index).padStart(3, "0")}.mp4`
                await this.encodeSegment(localFiles.get(segments[index].b2FilePath)!, segments[index], path.join(tempDir, name))
                names.push(name)
            }
            const listPath = path.join(tempDir, "concat.txt")
            await fs.promises.writeFile(listPath, names.map(concatLine).join("\n"))
            await this.spawnFfmpeg([
                "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", "concat.txt",
                "-c", "copy",
                "-movflags", "+faststart",
                outputPath,
            ], tempDir)
        }
        await this.assertOutput(outputPath)
        logger.info({ courtId, clubId, sources: segments.length }, "clip_extract_rendered")
        return outputPath
    }

    private static async assertDisk(directory: string, segments: PlannedClipSegment[]) {
        const unique = [...new Set(segments.map((segment) => segment.b2FilePath))]
        let total = 0
        for (const key of unique) {
            try {
                total += await B2Service.getObjectSize(key)
            } catch {
                throw new ClipExtractError("CLIP_PROCESSING_FAILED")
            }
        }
        let free = 0
        try {
            const stats = await fs.promises.statfs(directory)
            free = stats.bavail * stats.bsize
        } catch {
            throw new ClipExtractError("CLIP_PROCESSING_FAILED")
        }
        const required = total * 2 + config.CLIP_DISK_MARGIN_BYTES
        if (free < required) throw new ClipExtractError("CLIP_DISK_FULL")
    }

    private static async downloadSources(tempDir: string, segments: PlannedClipSegment[]) {
        const localFiles = new Map<string, string>()
        let index = 0
        for (const segment of segments) {
            if (localFiles.has(segment.b2FilePath)) continue
            const destination = path.join(tempDir, `source-${String(index).padStart(3, "0")}.mp4`)
            index += 1
            try {
                await B2Service.downloadToFile(segment.b2FilePath, destination)
            } catch {
                throw new ClipExtractError("CLIP_PROCESSING_FAILED")
            }
            localFiles.set(segment.b2FilePath, destination)
        }
        return localFiles
    }

    private static async encodeSegment(input: string, segment: PlannedClipSegment, output: string) {
        const duration = seconds(segment.durationMs)
        const hasAudio = await this.sourceHasAudio(input)
        if (hasAudio) {
            return this.spawnFfmpeg([
                "-y",
                "-ss", seconds(segment.localStartMs),
                "-i", input,
                "-t", duration,
                "-map", "0:v:0",
                "-map", "0:a:0",
                ...VIDEO_ENCODE,
                ...AUDIO_ENCODE,
                "-movflags", "+faststart",
                output,
            ])
        }
        return this.spawnFfmpeg([
            "-y",
            "-ss", seconds(segment.localStartMs),
            "-i", input,
            "-f", "lavfi",
            "-t", duration,
            "-i", SILENT_AUDIO,
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-t", duration,
            ...VIDEO_ENCODE,
            ...AUDIO_ENCODE,
            "-shortest",
            "-movflags", "+faststart",
            output,
        ])
    }

    private static async sourceHasAudio(input: string) {
        try {
            const probe = await probeMedia(input)
            return probe.streams?.some((stream) => stream.codec_type === "audio") ?? false
        } catch {
            return false
        }
    }

    private static spawnFfmpeg(args: string[], cwd?: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const child = spawn("ffmpeg", args, { cwd, env: { ...process.env, TZ: "UTC" } })
            this.child = child
            let settled = false
            child.stderr?.on("data", () => undefined)
            const finish = (error?: Error) => {
                if (settled) return
                settled = true
                if (this.child === child) this.child = null
                if (error) reject(error)
                else resolve()
            }
            child.on("error", () => finish(new ClipExtractError("CLIP_PROCESSING_FAILED")))
            child.on("exit", (code) => {
                if (code === 0) finish()
                else finish(new ClipExtractError("CLIP_PROCESSING_FAILED"))
            })
        })
    }

    private static runBounded<T>(work: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            let settled = false
            const timer = setTimeout(() => {
                if (settled) return
                settled = true
                this.killChild()
                reject(new ClipExtractError("CLIP_PROCESSING_TIMEOUT"))
            }, config.CLIP_FFMPEG_TIMEOUT_MS)
            work().then((value) => {
                if (settled) return
                settled = true
                clearTimeout(timer)
                resolve(value)
            }, (error: unknown) => {
                if (settled) return
                settled = true
                clearTimeout(timer)
                reject(error)
            })
        })
    }

    private static killChild() {
        const child = this.child
        if (!child) return
        child.kill("SIGTERM")
        const timer = setTimeout(() => {
            if (!child.killed) child.kill("SIGKILL")
        }, KILL_GRACE_MS)
        timer.unref?.()
    }

    private static async assertOutput(outputPath: string) {
        let probe
        try {
            probe = await probeMedia(outputPath)
        } catch {
            throw new ClipExtractError("CLIP_PROCESSING_FAILED")
        }
        const video = probe.streams?.find((stream) => stream.codec_type === "video")
        const audio = probe.streams?.find((stream) => stream.codec_type === "audio")
        if (!video || !audio) throw new ClipExtractError("CLIP_PROCESSING_FAILED")
        let duration = 0
        try {
            duration = parseDurationSeconds(probe)
        } catch {
            throw new ClipExtractError("CLIP_PROCESSING_FAILED")
        }
        if (!(duration > 0) || duration > MAX_OUTPUT_SECONDS) {
            throw new ClipExtractError("CLIP_PROCESSING_FAILED")
        }
        if ((video.width || 0) > 1920 || (video.height || 0) > 1080) {
            throw new ClipExtractError("CLIP_PROCESSING_FAILED")
        }
        if (parseFps(video.avg_frame_rate) > 60) {
            throw new ClipExtractError("CLIP_PROCESSING_FAILED")
        }
    }
}
