import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { FailedUploadService } from "../../../src/services/FailedUploadService"
import { pool } from "../../../src/config/db"
import fs from "fs"
import path from "path"
import { getDateInUTC } from "../../../src/utils/getDateInUTC"

test("debería obtener fallos permanentemente fallidos antiguos para limpieza", async () => {
    const club = new Club("Test Club", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
    const savedClub = await ClubService.createClub(club)

    const court = new Court(savedClub.id!, "Test Court", "192.168.0.1", "/stream1", "encryptedPass1")
    const savedCourt = await CourtService.createCourt(court)

    const now = new Date(Date.now() - 30 * 1000)
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const hh = String(now.getHours()).padStart(2, '0')
    const min = String(now.getMinutes()).padStart(2, '0')
    const videoFileName = `cancha${savedCourt.id}_${yyyy}-${mm}-${dd}_${hh}-${min}.mp4`
    const filePath = path.join("/var/videos", `club_${savedClub.id}`, `court_${savedCourt.id}`, videoFileName)
    fs.writeFileSync(filePath, "test content")

    await new Promise((resolve) => setTimeout(resolve, 5000))

    const endTimeUTC = getDateInUTC(new Date(Date.now()))

    const failedUpload = await FailedUploadService.registerFailedUpload(
        filePath,
        videoFileName,
        savedClub.id!,
        savedCourt.id!,
        endTimeUTC,
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

    const court = new Court(savedClub.id!, "Test Court", "192.168.0.1", "/stream1", "encryptedPass1")
    const savedCourt = await CourtService.createCourt(court)

    const filePaths: string[] = []
    const failedUploads = []

    for (let i = 0; i < 3; i++) {
        const now = new Date(Date.now() - 30 * 1000)
        now.setHours(now.getHours() + i)
        const yyyy = now.getFullYear()
        const mm = String(now.getMonth() + 1).padStart(2, '0')
        const dd = String(now.getDate()).padStart(2, '0')
        const hh = String(now.getHours()).padStart(2, '0')
        const min = String(now.getMinutes()).padStart(2, '0')
        const videoFileName = `cancha${savedCourt.id}_${yyyy}-${mm}-${dd}_${hh}-${min}.mp4`
        const filePath = path.join("/var/videos", `club_${savedClub.id}`, `court_${savedCourt.id}`, videoFileName)
        fs.writeFileSync(filePath, "test content")
        await new Promise((resolve) => setTimeout(resolve, 5000))

        filePaths.push(filePath)

        const endTimeUTC = getDateInUTC(new Date(Date.now()))

        const failedUpload = await FailedUploadService.registerFailedUpload(
            filePath,
            videoFileName,
            savedClub.id!,
            savedCourt.id!,
            endTimeUTC,
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

