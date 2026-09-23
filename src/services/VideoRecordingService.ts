import { spawn } from "child_process"
import { ActiveRecording, RecordingState } from "../types"
import path from "path"
import fs from "fs"
import { config } from "../config/config"
import { logger } from "../logger"

const STOP_TIMEOUT_MS = 8_000

export class VideoRecordingService {
    private static activeRecordings: Map<number, ActiveRecording> = new Map()
    static lastSegmentAt: Map<number, Date> = new Map()

    static async startRecording(
        courtId: number,
        clubId: number,
        rtspUrl: string,
        chunkDurationMs: number = config.VIDEO_CHUNK_DURATION_SECONDS * 1000
    ): Promise<void> {
        const existing = this.activeRecordings.get(courtId)
        if (existing) {
            if (existing.state === "stopping") {
                await this.waitForExit(existing)
            } else {
                logger.info({ courtId }, "recording_already_active")
                return
            }
        }

        const outputDir = path.join(config.VIDEO_DIR, `club_${clubId}`, `court_${courtId}`)
        fs.mkdirSync(outputDir, { recursive: true })

        const startTime = new Date()
        const fileName = this.generateFileName(courtId, startTime)
        const outputPath = path.join(outputDir, fileName)
        const segmentDuration = Math.floor(chunkDurationMs / 1000)
        const segmentPattern = path.join(outputDir, `cancha${courtId}_%Y-%m-%d_%H-%M-%S.mp4`)

        const ffmpegArgs = [
            "-rtsp_transport", "tcp",
            "-fflags", "+genpts+discardcorrupt",
            "-err_detect", "ignore_err",
            "-i", rtspUrl,
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-profile:v", "main",
            "-level", "4.0",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "-g", "60",
            "-sc_threshold", "0",
            "-f", "segment",
            "-segment_time", String(segmentDuration),
            "-reset_timestamps", "1",
            "-strftime", "1",
            segmentPattern,
        ]

        const ffmpegProcess = spawn("ffmpeg", ffmpegArgs, {
            env: { ...process.env, TZ: "UTC" },
        })

        const recording: ActiveRecording = {
            courtId,
            clubId,
            process: ffmpegProcess,
            outputPath,
            startTime,
            state: "starting",
        }
        this.activeRecordings.set(courtId, recording)

        ffmpegProcess.stderr.on("data", (data: Buffer) => {
            const output = data.toString()
            if (output.includes("Opening") || output.includes("time=")) {
                recording.state = "running"
                this.lastSegmentAt.set(courtId, new Date())
            }
            if (output.toLowerCase().includes("error")) {
                logger.warn({ courtId }, "recording_ffmpeg_stderr")
            }
        })

        ffmpegProcess.on("error", (error) => {
            logger.error({ err: error, courtId }, "recording_spawn_failed")
            this.activeRecordings.delete(courtId)
        })

        ffmpegProcess.on("exit", (code, signal) => {
            logger.info({ courtId, code, signal }, "recording_exit")
            this.activeRecordings.delete(courtId)
        })
    }

    static async stopRecording(courtId: number): Promise<void> {
        const recording = this.activeRecordings.get(courtId)
        if (!recording) return
        if (recording.state === "stopping") {
            await this.waitForExit(recording)
            return
        }
        recording.state = "stopping"
        await this.terminate(recording)
    }

    static async stopAllRecordings(): Promise<void> {
        const ids = Array.from(this.activeRecordings.keys())
        await Promise.all(ids.map((id) => this.stopRecording(id)))
    }

    static isRecording(courtId: number): boolean {
        const rec = this.activeRecordings.get(courtId)
        return Boolean(rec && rec.state !== "stopping")
    }

    static getActiveRecordings(): number[] {
        return Array.from(this.activeRecordings.keys())
    }

    static getState(courtId: number): RecordingState | undefined {
        return this.activeRecordings.get(courtId)?.state
    }

    private static terminate(recording: ActiveRecording): Promise<void> {
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                if (recording.process.exitCode === null) {
                    recording.process.kill("SIGKILL")
                }
            }, STOP_TIMEOUT_MS)
            recording.process.once("exit", () => {
                clearTimeout(timer)
                this.activeRecordings.delete(recording.courtId)
                resolve()
            })
            recording.process.kill("SIGTERM")
        })
    }

    private static waitForExit(recording: ActiveRecording): Promise<void> {
        if (recording.process.exitCode !== null) {
            this.activeRecordings.delete(recording.courtId)
            return Promise.resolve()
        }
        return new Promise((resolve) => {
            recording.process.once("exit", () => resolve())
        })
    }

    private static generateFileName(courtId: number, date: Date): string {
        const year = date.getUTCFullYear()
        const month = String(date.getUTCMonth() + 1).padStart(2, "0")
        const day = String(date.getUTCDate()).padStart(2, "0")
        const hours = String(date.getUTCHours()).padStart(2, "0")
        const minutes = String(date.getUTCMinutes()).padStart(2, "0")
        const seconds = String(date.getUTCSeconds()).padStart(2, "0")
        return `cancha${courtId}_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.mp4`
    }
}
