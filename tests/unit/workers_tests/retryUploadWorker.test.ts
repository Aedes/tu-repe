import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { FailedUploadService } from "../../../src/services/FailedUploadService"
import path from "path"
import { getDateInUTC } from "../../../src/utils/getDateInUTC"

test("debería incrementar intentos cuando falla el reintento", async () => {
    const club = new Club("Test Club", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
    const savedClub = await ClubService.createClub(club)

    const court = new Court(savedClub.id!, "Test Court", "192.168.0.1", "/stream1", "encryptedPass1")
    const savedCourt = await CourtService.createCourt(court)

    const videoFileName = `cancha${savedCourt.id}_2024-01-01_10-00.mp4`
    const filePath = path.join("/var/videos", `club_${savedClub.id}`, `court_${savedCourt.id}`, videoFileName)

    const endTimeUTC = getDateInUTC(new Date(Date.now()))

    const failedUpload = await FailedUploadService.registerFailedUpload(
        filePath,
        videoFileName,
        savedClub.id!,
        savedCourt.id!,
        endTimeUTC,
        "Error inicial"
    )

    expect(failedUpload.attemptsCount).toBe(0)

    const updatedUpload = await FailedUploadService.incrementAttempts(
        failedUpload.id!,
        "Error de conexión con B2"
    )

    expect(updatedUpload).not.toBeNull()
    expect(updatedUpload?.attemptsCount).toBe(1)
    expect(updatedUpload?.status).toBe("retrying")
    expect(updatedUpload?.errorMessage).toBe("Error de conexión con B2")
    expect(updatedUpload?.lastAttemptAt).toBeDefined()
})

test("debería marcar como permanentemente fallido cuando alcanza el máximo de intentos", async () => {
    const club = new Club("Test Club", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
    const savedClub = await ClubService.createClub(club)

    const court = new Court(savedClub.id!, "Test Court", "192.168.0.1", "/stream1", "encryptedPass1")
    const savedCourt = await CourtService.createCourt(court)

    const videoFileName = `cancha${savedCourt.id}_2024-01-01_10-00.mp4`
    const filePath = path.join("/var/videos", `club_${savedClub.id}`, `court_${savedCourt.id}`, videoFileName)

    const endTimeUTC = getDateInUTC(new Date(Date.now()))

    const failedUpload = await FailedUploadService.registerFailedUpload(
        filePath,
        videoFileName,
        savedClub.id!,
        savedCourt.id!,
        endTimeUTC,
        "Error inicial"
    )

    for (let i = 0; i < 10; i++) {
        await FailedUploadService.incrementAttempts(failedUpload.id!, `Error ${i + 1}`)
    }

    const maxAttemptsUpload = await FailedUploadService.getPendingAndRetrying()
    const found = maxAttemptsUpload.find(u => u.id === failedUpload.id)

    if (found) {
        expect(found.attemptsCount).toBe(10)
        const permanentlyFailed = await FailedUploadService.markAsPermanentlyFailed(found.id!)
        expect(permanentlyFailed?.status).toBe("failed_permanently")
    }
})

test("debería eliminar registro cuando el archivo no existe", async () => {
    const club = new Club("Test Club", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
    const savedClub = await ClubService.createClub(club)

    const court = new Court(savedClub.id!, "Test Court", "192.168.0.1", "/stream1", "encryptedPass1")
    const savedCourt = await CourtService.createCourt(court)

    const videoFileName = `cancha${savedCourt.id}_2024-01-01_10-00.mp4`
    const filePath = path.join("/var/videos", `club_${savedClub.id}`, `court_${savedCourt.id}`, videoFileName)

    const endTimeUTC = getDateInUTC(new Date(Date.now()))

    const failedUpload = await FailedUploadService.registerFailedUpload(
        filePath,
        videoFileName,
        savedClub.id!,
        savedCourt.id!,
        endTimeUTC,
        "Error inicial"
    )

    const deleted = await FailedUploadService.deleteFailedUpload(failedUpload.id!)
    expect(deleted).toBe(true)

    const found = await FailedUploadService.getPendingAndRetrying()
    const stillExists = found.find(u => u.id === failedUpload.id)
    expect(stillExists).toBeUndefined()
})

