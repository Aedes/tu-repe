import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { Video } from "../../../src/models/Video"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { VideoService } from "../../../src/services/VideoService"

describe("lectura de videos", () => {
    test("debería obtener un video persistido en la base de datos por su id", async () => {
        const club = new Club("Aedes Padel", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court 1", "rtsp://example.com/stream")
        const savedCourt = await CourtService.createCourt(court)

        const startTime = new Date("2024-01-01T10:00:00Z")
        const endTime = new Date("2024-01-01T10:10:00Z")

        const video = new Video(savedCourt.id!, "video1.mp4", startTime, endTime, "/example/path/video1.mp4")
        const savedVideo = await VideoService.createVideo(video)

        const fetchedVideo = await VideoService.findVideoById(savedVideo.id!)
        expect(fetchedVideo).not.toBeNull()
        expect(fetchedVideo?.id).toBe(savedVideo.id)
        expect(fetchedVideo?.courtId).toBe(savedVideo.courtId)
        expect(fetchedVideo?.fileName).toBe(savedVideo.fileName)
        expect(fetchedVideo?.startTime).toEqual(savedVideo.startTime)
        expect(fetchedVideo?.endTime).toEqual(savedVideo.endTime)
        expect(fetchedVideo?.b2FilePath).toEqual(savedVideo.b2FilePath)
    })

    test("debería obtener todos los videos de un court específico", async () => {
        const club = new Club("Aedes Padel", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court 1", "rtsp://example.com/stream")
        const savedCourt = await CourtService.createCourt(court)

        const startTime1 = new Date("2024-01-01T10:00:00Z")
        const endTime1 = new Date("2024-01-01T10:10:00Z")
        const startTime2 = new Date("2024-02-01T10:00:00Z")
        const endTime2 = new Date("2024-02-01T10:10:00Z")

        const video1 = new Video(savedCourt.id!, "video1.mp4", startTime1, endTime1, "/example/path/video1.mp4")
        const video2 = new Video(savedCourt.id!, "video2.mp4", startTime2, endTime2, "/example/path/video2.mp4")

        const savedVideo1 = await VideoService.createVideo(video1)
        const savedVideo2 = await VideoService.createVideo(video2)

        const videos = await VideoService.getVideosByCourtId(savedCourt.id!)

        expect(videos.length).toBeGreaterThanOrEqual(2)
        const videoFileNames = videos.map(v => v.fileName)
        expect(videoFileNames).toContain(savedVideo1.fileName)
        expect(videoFileNames).toContain(savedVideo2.fileName)
    })

    test("debería obtener todos los videos entre 2 fechas", async () => {
        const club = new Club("Aedes Padel", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court 1", "rtsp://example.com/stream")
        const savedCourt = await CourtService.createCourt(court)

        const startTime1 = new Date("2024-01-01T10:00:00Z")
        const endTime1 = new Date("2024-01-01T10:10:00Z")
        const startTime2 = new Date("2024-02-01T10:00:00Z")
        const endTime2 = new Date("2024-02-01T10:10:00Z")

        const video1 = new Video(savedCourt.id!, "video1.mp4", startTime1, endTime1, "/example/path/video1.mp4")
        const video2 = new Video(savedCourt.id!, "video2.mp4", startTime2, endTime2, "/example/path/video2.mp4")

        await VideoService.createVideo(video1)
        const savedVideo2 = await VideoService.createVideo(video2)

        const fromDate = new Date("2024-01-15T00:00:00Z")
        const toDate = new Date("2024-02-15T00:00:00Z")

        const videos = await VideoService.getVideosBetweenDates(fromDate, toDate)

        expect(videos.length).toBeGreaterThanOrEqual(1)
        const videoFileNames = videos.map(v => v.fileName)
        expect(videoFileNames).toContain(savedVideo2.fileName)
    })

    test("debería obtener todos los videos entre 2 fechas para un court específico", async () => {
        const club = new Club("Aedes Padel", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court 1", "rtsp://example.com/stream")
        const savedCourt = await CourtService.createCourt(court)

        const startTime1 = new Date("2024-01-01T10:00:00Z")
        const endTime1 = new Date("2024-01-01T10:10:00Z")
        const startTime2 = new Date("2024-02-01T10:00:00Z")
        const endTime2 = new Date("2024-02-01T10:10:00Z")

        const video1 = new Video(savedCourt.id!, "video1.mp4", startTime1, endTime1, "/example/path/video1.mp4")
        const video2 = new Video(savedCourt.id!, "video2.mp4", startTime2, endTime2, "/example/path/video2.mp4")

        await VideoService.createVideo(video1)
        const savedVideo2 = await VideoService.createVideo(video2)

        const fromDate = new Date("2024-01-15T00:00:00Z")
        const toDate = new Date("2024-02-15T00:00:00Z")

        const videos = await VideoService.getVideosBetweenDatesAndCourtId(fromDate, toDate, savedCourt.id!)

        expect(videos.length).toBeGreaterThanOrEqual(1)
        const videoFileNames = videos.map(v => v.fileName)
        expect(videoFileNames).toContain(savedVideo2.fileName)
    })

})