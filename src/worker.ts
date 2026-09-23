import { assertRuntimeReady } from "./config/startup"
import { initRecordingScheduler, stopRecordingScheduler } from "./workers/recordingScheduler"
import { initVideoIngestor, stopVideoIngestor } from "./workers/videoIngestor"
import { initRetryUploadWorker, stopRetryUploadWorker } from "./workers/retryUploadWorker"
import { initCleanupWorker, stopCleanupWorker } from "./workers/cleanupWorker"
import { initAppointmentVideoWorker, stopAppointmentVideoWorker } from "./workers/appointmentVideoWorker"
import { VideoRecordingService } from "./services/VideoRecordingService"
import { IngestionService } from "./services/IngestionService"
import { HeartbeatService } from "./services/HeartbeatService"
import { ClipConverterService } from "./services/ClipConverterService"
import { pool } from "./config/db"
import { config } from "./config/config"
import { logger } from "./logger"

const SHUTDOWN_MS = 20_000
let heartbeatTimer: NodeJS.Timeout | undefined
let startupReconcileTimer: NodeJS.Timeout | undefined
let stopping = false

const scheduleStartupReconcile = () => {
    startupReconcileTimer = setTimeout(() => {
        void IngestionService.reconcile().catch((error) => {
            logger.error({ err: error }, "startup_reconcile_error")
        })
    }, config.STABILITY_THRESHOLD_MS + 1_000)
    startupReconcileTimer.unref()
}

const start = async () => {
    await assertRuntimeReady()
    ClipConverterService.cleanupOldUploads()
    initVideoIngestor()
    await IngestionService.migrateFailedUploads()
    await IngestionService.reconcile()
    scheduleStartupReconcile()

    initRecordingScheduler()
    initRetryUploadWorker()
    initCleanupWorker()
    initAppointmentVideoWorker()

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
    if (startupReconcileTimer) clearTimeout(startupReconcileTimer)
    stopRecordingScheduler()
    stopVideoIngestor()
    stopRetryUploadWorker()
    stopCleanupWorker()
    await stopAppointmentVideoWorker()
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
