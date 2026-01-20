import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { FailedUploadService } from "../../../src/services/FailedUploadService"

test("debería incrementar el contador de intentos y actualizar el estado", async () => {
    const club = new Club("Test Club", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
    const savedClub = await ClubService.createClub(club)

    const court = new Court(savedClub.id!, "Test Court", "rtsp://example.com/stream")
    const savedCourt = await CourtService.createCourt(court)

    const failedUpload = await FailedUploadService.registerFailedUpload(
        "/var/videos/test.mp4",
        "test.mp4",
        savedClub.id!,
        savedCourt.id!,
        "Error inicial"
    )

    expect(failedUpload.attemptsCount).toBe(0)
    expect(failedUpload.status).toBe("pending")

    const updatedUpload = await FailedUploadService.incrementAttempts(
        failedUpload.id!,
        "Error en reintento"
    )

    expect(updatedUpload).not.toBeNull()
    expect(updatedUpload?.attemptsCount).toBe(1)
    expect(updatedUpload?.status).toBe("retrying")
    expect(updatedUpload?.errorMessage).toBe("Error en reintento")
    expect(updatedUpload?.lastAttemptAt).toBeDefined()
})

test("debería incrementar múltiples veces el contador de intentos", async () => {
    const club = new Club("Test Club", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
    const savedClub = await ClubService.createClub(club)

    const court = new Court(savedClub.id!, "Test Court", "rtsp://example.com/stream")
    const savedCourt = await CourtService.createCourt(court)

    const failedUpload = await FailedUploadService.registerFailedUpload(
        "/var/videos/test.mp4",
        "test.mp4",
        savedClub.id!,
        savedCourt.id!,
        "Error inicial"
    )

    await FailedUploadService.incrementAttempts(failedUpload.id!, "Error 1")
    await FailedUploadService.incrementAttempts(failedUpload.id!, "Error 2")
    const finalUpload = await FailedUploadService.incrementAttempts(failedUpload.id!, "Error 3")

    expect(finalUpload?.attemptsCount).toBe(3)
    expect(finalUpload?.status).toBe("retrying")
})

