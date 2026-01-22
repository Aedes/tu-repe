import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { FailedUploadService } from "../../../src/services/FailedUploadService"
import { pool } from "../../../src/config/db"
import fs from "fs"
import path from "path"

test("debería obtener fallos permanentemente fallidos antiguos para limpieza", async () => {
    const club = new Club("Test Club", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
    const savedClub = await ClubService.createClub(club)

    const court = new Court(savedClub.id!, "Test Court", "rtsp://example.com/stream")
    const savedCourt = await CourtService.createCourt(court)

    const videoFileName = `cancha${savedCourt.id}_2024-01-01_10-00.mp4`
    const filePath = path.join("/var/videos", `club_${savedClub.id}`, `court_${savedCourt.id}`, videoFileName)
    fs.writeFileSync(filePath, "test content")

    await new Promise((resolve) => setTimeout(resolve, 5000))

    const failedUpload = await FailedUploadService.registerFailedUpload(
        filePath,
        videoFileName,
        savedClub.id!,
        savedCourt.id!,
        "Error"
    )

    await FailedUploadService.markAsPermanentlyFailed(failedUpload.id!)

    await pool.query(
        `UPDATE failed_uploads 
         SET created_at = DATE_SUB(NOW(), INTERVAL 4 DAY) 
         WHERE id = ?`,
        [failedUpload.id!]
    )

    const oldFailed = await FailedUploadService.getOldPermanentlyFailed(3)

    expect(oldFailed.length).toBeGreaterThanOrEqual(1)
    const found = oldFailed.find(u => u.id === failedUpload.id)
    expect(found).toBeDefined()

    await FailedUploadService.deleteFailedUpload(found!.id!)

    expect(fs.existsSync(filePath)).toBe(false)

    const stillExists = await FailedUploadService.getOldPermanentlyFailed(3)
    const stillFound = stillExists.find(u => u.id === failedUpload.id)
    expect(stillFound).toBeUndefined()
})

test("debería limpiar múltiples archivos permanentemente fallidos", async () => {
    const club = new Club("Test Club", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
    const savedClub = await ClubService.createClub(club)

    const court = new Court(savedClub.id!, "Test Court", "rtsp://example.com/stream")
    const savedCourt = await CourtService.createCourt(court)

    const filePaths: string[] = []
    const failedUploads = []

    for (let i = 0; i < 3; i++) {
        const videoFileName = `cancha${savedCourt.id}_2024-01-01_1${i}-00.mp4`
        const filePath = path.join("/var/videos", `club_${savedClub.id}`, `court_${savedCourt.id}`, videoFileName)
        fs.writeFileSync(filePath, "test content")
        await new Promise((resolve) => setTimeout(resolve, 5000))

        filePaths.push(filePath)

        const failedUpload = await FailedUploadService.registerFailedUpload(
            filePath,
            videoFileName,
            savedClub.id!,
            savedCourt.id!,
            "Error"
        )

        await FailedUploadService.markAsPermanentlyFailed(failedUpload.id!)

        await pool.query(
            `UPDATE failed_uploads 
             SET created_at = DATE_SUB(NOW(), INTERVAL 4 DAY) 
             WHERE id = ?`,
            [failedUpload.id!]
        )

        failedUploads.push(failedUpload)
    }

    const oldFailed = await FailedUploadService.getOldPermanentlyFailed(3)

    expect(oldFailed.length).toBeGreaterThanOrEqual(3)

    for (const failedUpload of oldFailed) {
        if (fs.existsSync(failedUpload.filePath)) {
            fs.unlinkSync(failedUpload.filePath)
        }
        await FailedUploadService.deleteFailedUpload(failedUpload.id!)
    }

    const remaining = await FailedUploadService.getOldPermanentlyFailed(3)
    expect(remaining.length).toBe(0)
})

