import cron from "node-cron";
import { ClubService } from "../services/ClubService";
import { VideoRecordingService } from "../services/VideoRecordingService";
import { VIDEO_CHUNK_DURATION_MS } from "../config/config";
import { CourtService } from "../services/CourtService";

export const initRecordingScheduler = () => {
    console.log("⏰ Scheduler de grabación iniciado");

    cron.schedule("* * * * *", async () => {
        try {
            await checkAndManageRecordings();
        } catch (error: any) {
            console.error("❌ Error en el scheduler de grabación:", error.message);
        }
    });

    checkAndManageRecordings();
};

export async function checkAndManageRecordings() {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    try {
        const clubsWithCourts = await ClubService.getAllClubsWithCourts();

        for (const club of clubsWithCourts) {
            if (!club.id || !club.openTime || !club.closeTime) {
                continue;
            }

            const openTime = parseTime(club.openTime);
            const closeTime = parseTime(club.closeTime);
            const currentTimeDate = parseTime(currentTime);

            const shouldBeRecording = isTimeInRange(currentTimeDate, openTime, closeTime);

            const courts = club.courts || [];
            for (const court of courts) {
                if (!court.id || !court.cameraHost || !court.cameraPort || !court.cameraPath || !court.rtspUsername || !court.rtspPasswordEncrypted) {
                    continue;
                }

                const isCurrentlyRecording = VideoRecordingService.isRecording(court.id);

                if (shouldBeRecording && !isCurrentlyRecording) {

                    const rtspUrl = CourtService.buildRtspUrl(court)

                    try {
                        await VideoRecordingService.startRecording(
                            court.id,
                            club.id,
                            rtspUrl,
                            VIDEO_CHUNK_DURATION_MS
                        );
                    } catch (error: any) {
                        console.error(`❌ Error al iniciar grabación para cancha ${court.id}:`, error.message);
                    }
                } else if (!shouldBeRecording && isCurrentlyRecording) {
                    try {
                        await VideoRecordingService.stopRecording(court.id);
                    } catch (error: any) {
                        console.error(`❌ Error al detener grabación para cancha ${court.id}:`, error.message);
                    }
                }
            }
        }
    } catch (error: any) {
        console.error("❌ Error al verificar horarios de clubes:", error.message);
    }
}

export function parseTime(timeString: string): Date {
    const parts = timeString.split(":");
    const hours = Number(parts[0]) || 0;
    const minutes = Number(parts[1]) || 0;
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
}

export function isTimeInRange(currentTime: Date, openTime: Date, closeTime: Date): boolean {
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const openMinutes = openTime.getHours() * 60 + openTime.getMinutes();
    const closeMinutes = closeTime.getHours() * 60 + closeTime.getMinutes();

    if (closeMinutes < openMinutes) {
        return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
    } else {
        return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    }
}

