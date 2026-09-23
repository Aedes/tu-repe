import { RetentionService } from "../services/RetentionService"
import { ClipConverterService } from "../services/ClipConverterService"
import { IngestionService } from "../services/IngestionService"
import { logger } from "../logger"

let retentionTimer: NodeJS.Timeout | undefined
let deletionTimer: NodeJS.Timeout | undefined
let cleanupTimer: NodeJS.Timeout | undefined

export const initCleanupWorker = () => {
    const retain = async () => {
        try {
            const count = await RetentionService.enqueueExpired()
            if (count) logger.info({ count }, "retention_enqueued")
        } catch (error) {
            logger.error({ err: error }, "retention_worker_error")
        }
    }
    const deleteNext = async () => {
        try {
            await RetentionService.processNext()
        } catch (error) {
            logger.error({ err: error }, "deletion_worker_error")
        }
    }
    const cleanup = () => {
        ClipConverterService.cleanupOldUploads()
        void IngestionService.reconcile()
    }

    void retain()
    void deleteNext()
    cleanup()
    retentionTimer = setInterval(() => void retain(), 60 * 60 * 1000)
    deletionTimer = setInterval(() => void deleteNext(), 10_000)
    cleanupTimer = setInterval(cleanup, 60 * 60 * 1000)
    logger.info("cleanup_worker_started")
}

export const stopCleanupWorker = () => {
    if (retentionTimer) clearInterval(retentionTimer)
    if (deletionTimer) clearInterval(deletionTimer)
    if (cleanupTimer) clearInterval(cleanupTimer)
}
