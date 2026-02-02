import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { FailedUploadService } from "../../../src/services/FailedUploadService"

test("debería obtener todos los fallos pendientes y en reintento", async () => {
    const club = new Club("Test Club", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
    const savedClub = await ClubService.createClub(club)

    const court = new Court(savedClub.id!, "Test Court", "192.168.0.1", "/stream1", "encryptedPass1")
    const savedCourt = await CourtService.createCourt(court)

    const failedUpload1 = await FailedUploadService.registerFailedUpload(
        "/var/videos/test1.mp4",
        "test1.mp4",
        savedClub.id!,
        savedCourt.id!,
        "Error 1"
    )

    const failedUpload2 = await FailedUploadService.registerFailedUpload(
        "/var/videos/test2.mp4",
        "test2.mp4",
        savedClub.id!,
        savedCourt.id!,
        "Error 2"
    )

    await FailedUploadService.markAsPermanentlyFailed(failedUpload2.id!)

    const pendingAndRetrying = await FailedUploadService.getPendingAndRetrying()

    expect(pendingAndRetrying.length).toBeGreaterThanOrEqual(1)
    const foundUpload = pendingAndRetrying.find(u => u.id === failedUpload1.id)
    expect(foundUpload).toBeDefined()
    expect(foundUpload?.status).toBe("pending")

    const permanentlyFailed = pendingAndRetrying.find(u => u.id === failedUpload2.id)
    expect(permanentlyFailed).toBeUndefined()
})

