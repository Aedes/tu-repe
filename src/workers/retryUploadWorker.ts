import { IngestionService } from "../services/IngestionService"
import { logger } from "../logger"

let timer: NodeJS.Timeout | undefined

export const initRetryUploadWorker = () => {
    const tick = async () => {
        try {
            await IngestionService.processNext()
        } catch (error) {
            logger.error({ err: error }, "ingestion_worker_error")
        }
    }
    void tick()
    timer = setInterval(() => void tick(), 5_000)
    logger.info("ingestion_worker_started")
}

export const stopRetryUploadWorker = () => {
    if (timer) clearInterval(timer)
}
