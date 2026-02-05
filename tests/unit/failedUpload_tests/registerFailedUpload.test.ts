import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { FailedUploadService } from "../../../src/services/FailedUploadService"
import { getDateInUTC } from "../../../src/utils/getDateInUTC"

test("debería registrar un fallo de subida en la base de datos", async () => {
    const club = new Club("Test Club", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
    const savedClub = await ClubService.createClub(club)

    const court = new Court(savedClub.id!, "Test Court", "192.168.0.1", "/stream1", "encryptedPass1")
    const savedCourt = await CourtService.createCourt(court)

    const filePath = "/var/videos/test_video.mp4"
    const fileName = "test_video.mp4"
    const errorMessage = "Error de conexión con B2"

    const endTimeUTC = getDateInUTC(new Date(Date.now()))

    const failedUpload = await FailedUploadService.registerFailedUpload(
        filePath,
        fileName,
        savedClub.id!,
        savedCourt.id!,
        endTimeUTC,
        errorMessage
    )

    expect(failedUpload.id).toBeDefined()
    expect(failedUpload.filePath).toBe(filePath)
    expect(failedUpload.fileName).toBe(fileName)
    expect(failedUpload.clubId).toBe(savedClub.id)
    expect(failedUpload.courtId).toBe(savedCourt.id)
    expect(failedUpload.errorMessage).toBe(errorMessage)
    expect(failedUpload.attemptsCount).toBe(0)
    expect(failedUpload.status).toBe("pending")
    expect(failedUpload.createdAt).toBeDefined()
})

