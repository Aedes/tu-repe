import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { FailedUploadService } from "../../../src/services/FailedUploadService"
import { pool } from "../../../src/config/db"
import { getDateInUTC } from "../../../src/utils/getDateInUTC"

test("debería obtener fallos permanentemente fallidos más antiguos que X días", async () => {
    const club = new Club("Test Club", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
    const savedClub = await ClubService.createClub(club)

    const court = new Court(savedClub.id!, "Test Court", "192.168.0.1", "/stream1", "encryptedPass1")
    const savedCourt = await CourtService.createCourt(court)

    const endTimeUTC = getDateInUTC(new Date(Date.now()))

    const failedUpload = await FailedUploadService.registerFailedUpload(
        "/var/videos/test.mp4",
        "test.mp4",
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
    expect(found?.status).toBe("failed_permanently")
})

test("no debería obtener fallos permanentemente fallidos más recientes que X días", async () => {
    const club = new Club("Test Club", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
    const savedClub = await ClubService.createClub(club)

    const court = new Court(savedClub.id!, "Test Court", "192.168.0.1", "/stream1", "encryptedPass1")
    const savedCourt = await CourtService.createCourt(court)

    const endTimeUTC = getDateInUTC(new Date(Date.now()))

    const failedUpload = await FailedUploadService.registerFailedUpload(
        "/var/videos/test_recent.mp4",
        "test_recent.mp4",
        savedClub.id!,
        savedCourt.id!,
        endTimeUTC,
        "Error"
    )

    await FailedUploadService.markAsPermanentlyFailed(failedUpload.id!)

    const oldFailed = await FailedUploadService.getOldPermanentlyFailed(3)

    const found = oldFailed.find(u => u.id === failedUpload.id)
    expect(found).toBeUndefined()
})

