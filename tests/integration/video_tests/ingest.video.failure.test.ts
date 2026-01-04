import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { FailedUploadService } from "../../../src/services/FailedUploadService"
import { VideoService } from "../../../src/services/VideoService"
import { extractMetadataFromFileName } from "../../../src/utils/extractMetadataFromFileName"
import path from "path"

describe("debería registrar un fallo cuando no puede subir el video a B2", () => {
    test("debería registrar fallo y no crear video cuando B2Service falla", async () => {
        const club = new Club("Test Club", "08:00", "22:00")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Test Court", "rtsp://example.com/stream")
        const savedCourt = await CourtService.createCourt(court)

        const videoFileName = `cancha${savedCourt.id}_2024-01-01_10-00.mp4`
        const videoFilePath = path.join("/var/videos", `club_${savedClub.id}`, `court_${savedCourt.id}`, videoFileName)

        const metadata = extractMetadataFromFileName(videoFileName)
        expect(metadata).not.toBeNull()

        if (!metadata) return

        const { courtId } = metadata
        const foundCourt = await CourtService.findCourtById(courtId)
        expect(foundCourt).not.toBeNull()

        if (!foundCourt) return

        const errorMessage = "Error de conexión con B2"

        await FailedUploadService.registerFailedUpload(
            videoFilePath,
            videoFileName,
            foundCourt.clubId,
            courtId,
            errorMessage
        )

        const pendingUploads = await FailedUploadService.getPendingAndRetrying()
        const foundFailure = pendingUploads.find(
            (u) => u.filePath === videoFilePath && u.fileName === videoFileName
        )

        expect(foundFailure).toBeDefined()
        expect(foundFailure?.status).toBe("pending")
        expect(foundFailure?.clubId).toBe(savedClub.id)
        expect(foundFailure?.courtId).toBe(savedCourt.id)
        expect(foundFailure?.attemptsCount).toBe(0)
        expect(foundFailure?.errorMessage).toBe(errorMessage)

        const videos = await VideoService.getVideosByCourtId(courtId)
        const ingestedVideo = videos.find((v) => v.fileName === videoFileName)
        expect(ingestedVideo).toBeUndefined()

    })
})

