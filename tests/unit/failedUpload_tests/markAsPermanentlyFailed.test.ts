import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { FailedUploadService } from "../../../src/services/FailedUploadService"

test("debería marcar un fallo como permanentemente fallido", async () => {
    const club = new Club("Test Club", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
    const savedClub = await ClubService.createClub(club)

    const court = new Court(savedClub.id!, "Test Court", "192.168.0.1", 554, "/stream1", "user1", "encryptedPass1")
    const savedCourt = await CourtService.createCourt(court)

    const failedUpload = await FailedUploadService.registerFailedUpload(
        "/var/videos/test.mp4",
        "test.mp4",
        savedClub.id!,
        savedCourt.id!,
        "Error inicial"
    )

    expect(failedUpload.status).toBe("pending")

    const markedUpload = await FailedUploadService.markAsPermanentlyFailed(failedUpload.id!)

    expect(markedUpload).not.toBeNull()
    expect(markedUpload?.status).toBe("failed_permanently")
})

