import { spawn } from "child_process";
import { ActiveRecording } from "../types";
import path from "path";
import fs from "fs";

export class VideoRecordingService {
    private static activeRecordings: Map<number, ActiveRecording> = new Map();

    static async startRecording(
        courtId: number,
        clubId: number,
        rtspUrl: string,
        chunkDurationMs: number = 60 * 15 * 1000
    ): Promise<void> {
        if (this.activeRecordings.has(courtId)) {
            console.log(`⚠️ Ya existe una grabación activa para la cancha ${courtId}`);
            return;
        }

        const outputDir = path.join("/var/videos", `club_${clubId}`, `court_${courtId}`);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const startTime = new Date();
        const fileName = this.generateFileName(courtId, startTime);
        const outputPath = path.join(outputDir, fileName);

        console.log(`🎬 Iniciando grabación para cancha ${courtId} del club ${clubId}`);
        console.log(`   Stream: ${rtspUrl}`);
        console.log(`   Archivo: ${outputPath}`);

        try {
            const segmentDuration = Math.floor(chunkDurationMs / 1000);
            const segmentPattern = path.join(outputDir, `cancha${courtId}_%Y-%m-%d_%H-%M-%S.mp4`);

            const ffmpegArgs = [
                "-rtsp_transport", "tcp",
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
                "-segment_time", segmentDuration.toString(),
                "-reset_timestamps", "1",
                "-strftime", "1",
                segmentPattern
            ];

            const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

            ffmpegProcess.stderr.on("data", (data: Buffer) => {
                const output = data.toString();
                if (output.includes("error") || output.includes("Error")) {
                    console.error(`❌ Error en grabación cancha ${courtId}:`, output);
                }
            });

            ffmpegProcess.on("error", (error) => {
                console.error(`❌ Error al iniciar ffmpeg para cancha ${courtId}:`, error);
                this.activeRecordings.delete(courtId);
            });

            ffmpegProcess.on("exit", (code, signal) => {
                console.log(`🛑 Grabación finalizada para cancha ${courtId}. Código: ${code}, Señal: ${signal}`);
                this.activeRecordings.delete(courtId);
            });

            this.activeRecordings.set(courtId, {
                courtId,
                clubId,
                process: ffmpegProcess,
                outputPath,
                startTime
            });

            console.log(`✅ Grabación iniciada exitosamente para cancha ${courtId}`);
        } catch (error: any) {
            console.error(`❌ Error al iniciar grabación para cancha ${courtId}:`, error.message);
            this.activeRecordings.delete(courtId);
            throw error;
        }
    }

    static async stopRecording(courtId: number): Promise<void> {
        const recording = this.activeRecordings.get(courtId);

        if (!recording) {
            console.log(`⚠️ No hay grabación activa para la cancha ${courtId}`);
            return;
        }

        console.log(`🛑 Deteniendo grabación para cancha ${courtId}`);

        try {
            recording.process.kill("SIGTERM");

            setTimeout(() => {
                if (recording.process && !recording.process.killed) {
                    console.log(`⚠️ Forzando cierre de grabación para cancha ${courtId}`);
                    recording.process.kill("SIGKILL");
                }
            }, 5000);

            this.activeRecordings.delete(courtId);
            console.log(`✅ Grabación detenida para cancha ${courtId}`);
        } catch (error: any) {
            console.error(`❌ Error al detener grabación para cancha ${courtId}:`, error.message);
            this.activeRecordings.delete(courtId);
        }
    }

    static async stopAllRecordings(): Promise<void> {
        const courtIds = Array.from(this.activeRecordings.keys());
        console.log(`🛑 Deteniendo ${courtIds.length} grabaciones activas...`);

        await Promise.all(
            courtIds.map(courtId => this.stopRecording(courtId))
        );
    }

    static isRecording(courtId: number): boolean {
        return this.activeRecordings.has(courtId);
    }

    static getActiveRecordings(): number[] {
        return Array.from(this.activeRecordings.keys());
    }

    private static generateFileName(courtId: number, date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");

        return `cancha${courtId}_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.mp4`;
    }
}

