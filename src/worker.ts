import { assertRuntimeReady } from "./config/startup"
import { initRecordingScheduler, stopRecordingScheduler } from "./workers/recordingScheduler"
import { initVideoIngestor, stopVideoIngestor } from "./workers/videoIngestor"
import { initRetryUploadWorker, stopRetryUploadWorker } from "./workers/retryUploadWorker"
import { initCleanupWorker, stopCleanupWorker } from "./workers/cleanupWorker"
import { VideoRecordingService } from "./services/VideoRecordingService"
import { IngestionService } from "./services/IngestionService"
import { HeartbeatService } from "./services/HeartbeatService"
import { ClipConverterService } from "./services/ClipConverterService"
import { pool } from "./config/db"
import { logger } from "./logger"

const SHUTDOWN_MS = 20_000
let heartbeatTimer: NodeJS.Timeout | undefined
let stopping = false

const start = async () => {
    await assertRuntimeReady()
    ClipConverterService.cleanupOldUploads()
    await IngestionService.migrateFailedUploads()
    await IngestionService.reconcile()

    initRecordingScheduler()
    initVideoIngestor()
    initRetryUploadWorker()
    initCleanupWorker()

    heartbeatTimer = setInterval(() => {
        void HeartbeatService.beat("worker", {
            recordings: VideoRecordingService.getActiveRecordings(),
        })
    }, 30_000)
    await HeartbeatService.beat("worker")

    logger.info("worker_started")
}

const shutdown = async (signal: string) => {
    if (stopping) return
    stopping = true
    logger.info({ signal }, "worker_shutdown")
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    stopRecordingScheduler()
    stopVideoIngestor()
    stopRetryUploadWorker()
    stopCleanupWorker()
    await VideoRecordingService.stopAllRecordings()
    await pool.end()
    process.exit(0)
}

start().catch((error) => {
    logger.error({ err: error }, "worker_start_failed")
    process.exit(1)
})

process.on("SIGTERM", () => {
    void shutdown("SIGTERM")
    setTimeout(() => process.exit(1), SHUTDOWN_MS).unref()
})
process.on("SIGINT", () => {
    void shutdown("SIGINT")
    setTimeout(() => process.exit(1), SHUTDOWN_MS).unref()
})
