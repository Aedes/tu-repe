import cron from "node-cron"
import { ClubService } from "../services/ClubService"
import { VideoRecordingService } from "../services/VideoRecordingService"
import { VIDEO_CHUNK_DURATION_MS, config } from "../config/config"
import { logger } from "../logger"

let task: { stop: () => void } | undefined
const courtLocks = new Set<number>()
let cycleRunning = false

export const initRecordingScheduler = () => {
    task = cron.schedule("* * * * *", async () => {
        try {
            await checkAndManageRecordings()
        } catch (error) {
            logger.error({ err: error }, "recording_scheduler_error")
        }
    })
    void checkAndManageRecordings()
    logger.info("recording_scheduler_started")
}

export const stopRecordingScheduler = () => {
    task?.stop()
}

export async function checkAndManageRecordings() {
    if (cycleRunning) return
    cycleRunning = true
    try {
        const now = new Date()
        const currentTime = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`
        const clubsWithCourts = await ClubService.getAllClubsWithCourts()

        for (const club of clubsWithCourts) {
            if (!club.id || !club.openTime || !club.closeTime) continue
            const shouldBeRecording = isTimeInRange(parseTime(currentTime), parseTime(club.openTime), parseTime(club.closeTime))
            const courts = club.courts || []
            for (const court of courts) {
                if (!court.id || !court.streamKey) continue
                if (courtLocks.has(court.id)) continue
                courtLocks.add(court.id)
                try {
                    const isCurrentlyRecording = VideoRecordingService.isRecording(court.id)
                    const rtspUrl = `${config.MEDIA_SERVER_RTSP_BASE_URL.replace(/\/$/, "")}/${court.cameraPath}`
                    if (shouldBeRecording && !isCurrentlyRecording) {
                        await VideoRecordingService.startRecording(court.id, club.id, rtspUrl, VIDEO_CHUNK_DURATION_MS)
                    } else if (!shouldBeRecording && isCurrentlyRecording) {
                        await VideoRecordingService.stopRecording(court.id)
                    }
                } catch (error) {
                    logger.error({ err: error, courtId: court.id }, "recording_manage_failed")
                } finally {
                    courtLocks.delete(court.id)
                }
            }
        }
    } finally {
        cycleRunning = false
    }
}

export function parseTime(timeString: string): Date {
    const parts = timeString.split(":")
    const hours = Number(parts[0]) || 0
    const minutes = Number(parts[1]) || 0
    const date = new Date()
    date.setUTCHours(hours, minutes, 0, 0)
    return date
}

export function isTimeInRange(currentTime: Date, openTime: Date, closeTime: Date): boolean {
    const currentMinutes = currentTime.getUTCHours() * 60 + currentTime.getUTCMinutes()
    const openMinutes = openTime.getUTCHours() * 60 + openTime.getUTCMinutes()
    const closeMinutes = closeTime.getUTCHours() * 60 + closeTime.getUTCMinutes()
    if (closeMinutes < openMinutes) {
        return currentMinutes >= openMinutes || currentMinutes < closeMinutes
    }
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes
}
