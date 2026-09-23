import { AppointmentVideoService } from "../services/AppointmentVideoService"
import { AppointmentVideoConcatService } from "../services/AppointmentVideoConcatService"
import { config } from "../config/config"
import { logger } from "../logger"

let timer: NodeJS.Timeout | undefined
let running = false
let stopping = false

export const initAppointmentVideoWorker = () => {
    stopping = false
    AppointmentVideoConcatService.cleanupStale(config.APPOINTMENT_MERGE_LOCK_TIMEOUT_MINUTES * 60 * 1000)
    const tick = async () => {
        if (running || stopping) return
        running = true
        try {
            await AppointmentVideoService.processNext()
        } catch (error) {
            logger.error({ err: error }, "appointment_merge_worker_error")
        } finally {
            running = false
        }
    }
    void tick()
    timer = setInterval(() => void tick(), config.APPOINTMENT_MERGE_WORKER_INTERVAL_MS)
    logger.info("appointment_merge_worker_started")
}

export const stopAppointmentVideoWorker = async () => {
    stopping = true
    if (timer) clearInterval(timer)
    AppointmentVideoConcatService.abort()
    await AppointmentVideoService.waitForIdle()
}
