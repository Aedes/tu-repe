import fs from "fs"
import path from "path"
import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { VideoService } from "../../../src/services/VideoService"
import { IngestionService } from "../../../src/services/IngestionService"
import { B2Service } from "../../../src/services/B2Service"
import * as ffprobe from "../../../src/utils/ffprobe"
import { config } from "../../../src/config/config"

describe("debería detectar un video nuevo en el directorio de ingestión y procesarlo correctamente", () => {
    test("Ingestor de video procesa nuevo archivo", async () => {
        const club = await ClubService.createClub(new Club(
            "Club for Video Ingestor", "08:00", "22:00", 60,
            "Argentina", "Mendoza", "San Rafael", "Comandante Salas 660", "urlId"
        ))
        const court = await CourtService.createCourt(
            new Court(club.id!, "Court for Video Ingestor", "192.168.0.1", "/stream", "stream-key")
        )
        const videoFileName = `cancha${court.id}_2024-01-01_10-00-00.mp4`
        const videoFilePath = path.join(config.VIDEO_DIR, `club_${club.id}`, `court_${court.id}`, videoFileName)

        fs.writeFileSync(videoFilePath, "video")
        jest.spyOn(ffprobe, "probeMedia").mockResolvedValue({ format: { duration: 900 }, streams: [] } as any)
        jest.spyOn(B2Service, "uploadFileAndGetFilePath")
            .mockResolvedValue(`club_${club.id}/court_${court.id}/${videoFileName}`)

        await IngestionService.registerFile(videoFilePath)
        expect(await IngestionService.processNext()).toBe(true)

        const videos = await VideoService.getVideosByCourtId(court.id!)
        const ingestedVideo = videos.find((video) => video.fileName === videoFileName)

        expect(ingestedVideo).toBeDefined()
        expect(ingestedVideo?.courtId).toBe(court.id)
        expect(ingestedVideo?.b2FilePath).toBe(`club_${club.id}/court_${court.id}/${videoFileName}`)
        expect(ingestedVideo?.startTime.toISOString()).toBe("2024-01-01T10:00:00.000Z")
        expect(fs.existsSync(videoFilePath)).toBe(false)

        jest.restoreAllMocks()
    })
})