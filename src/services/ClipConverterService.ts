import fs from "fs"
import path from "path"
import { spawn } from "child_process"
import { AppError } from "../errors/AppError"
import { logger } from "../logger"
import { parseDurationSeconds, parseFps, probeMedia } from "../utils/ffprobe"
import { config } from "../config/config"

const MAX_WAITERS = 3
const FFMPEG_TIMEOUT_MS = 60_000

class SerialQueue {
    private waiters = 0
    private chain: Promise<unknown> = Promise.resolve()

    enqueue<T>(work: () => Promise<T>): Promise<T> {
        if (this.waiters >= MAX_WAITERS) {
            throw AppError.unavailable("Cola de conversión llena")
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

export class ClipConverterService {
    static async convertWebmToMp4(webmPath: string): Promise<string> {
        return queue.enqueue(() => this.convert(webmPath))
    }

    private static async convert(webmPath: string): Promise<string> {
        await this.assertValidClip(webmPath)
        const outputPath = path.join(config.UPLOAD_DIR, `${path.parse(webmPath).name}.mp4`)
        await this.runFfmpeg(webmPath, outputPath)
        return outputPath
    }

    private static async assertValidClip(webmPath: string) {
        const probe = await probeMedia(webmPath)
        const formatName = probe.format?.format_name || ""
        if (!formatName.includes("webm") && !formatName.includes("matroska")) {
            throw AppError.badRequest("El clip no es WebM")
        }
        const duration = parseDurationSeconds(probe)
        if (duration > 35) {
            throw AppError.badRequest("El clip supera los 30 segundos")
        }
        const video = probe.streams?.find((stream) => stream.codec_type === "video")
        if (!video) throw AppError.badRequest("El clip no contiene video")
        if ((video.width || 0) > 1920 || (video.height || 0) > 1080) {
            throw AppError.badRequest("Resolución de clip no permitida")
        }
        if (parseFps(video.avg_frame_rate) > 60) {
            throw AppError.badRequest("FPS de clip no permitidos")
        }
    }

    private static runFfmpeg(input: string, output: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const args = [
                "-y",
                "-threads", "1",
                "-i", input,
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-pix_fmt", "yuv420p",
                "-movflags", "+faststart",
                "-c:a", "aac",
                output,
            ]
            const child = spawn("ffmpeg", args, { env: { ...process.env, TZ: "UTC" } })
            const timer = setTimeout(() => {
                child.kill("SIGTERM")
                setTimeout(() => {
                    if (!child.killed) child.kill("SIGKILL")
                }, 3000)
                reject(AppError.unavailable("Timeout al convertir clip"))
            }, FFMPEG_TIMEOUT_MS)

            child.on("error", (error) => {
                clearTimeout(timer)
                reject(error)
            })
            child.on("exit", (code) => {
                clearTimeout(timer)
                if (code === 0) resolve()
                else reject(new Error("ffmpeg falló"))
            })
        })
    }

    static cleanup(paths: string[]) {
        for (const filePath of paths) {
            try {
                if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath)
            } catch (error) {
                logger.warn({ err: error, filePath }, "clip_cleanup_failed")
            }
        }
    }

    static cleanupOldUploads(maxAgeMs = 60 * 60 * 1000) {
        if (!fs.existsSync(config.UPLOAD_DIR)) return
        const now = Date.now()
        for (const name of fs.readdirSync(config.UPLOAD_DIR)) {
            const full = path.join(config.UPLOAD_DIR, name)
            try {
                const stat = fs.statSync(full)
                if (stat.isDirectory()) continue
                if (now - stat.mtimeMs > maxAgeMs) fs.unlinkSync(full)
            } catch (error) {
                logger.warn({ err: error, full }, "upload_cleanup_failed")
            }
        }
    }
}
