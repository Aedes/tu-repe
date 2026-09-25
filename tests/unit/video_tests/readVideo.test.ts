import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { Video } from "../../../src/models/Video"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { VideoService } from "../../../src/services/VideoService"

describe("lectura de videos", () => {
    test("debería obtener un video persistido en la base de datos por su id", async () => {
        const club = new Club("Aedes Padel", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123", "urlId")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court 1", "192.168.0.1", "/stream1", "encryptedPass1")
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
        const club = new Club("Aedes Padel", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123", "urlId")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court 1", "192.168.0.1", "/stream1", "encryptedPass1")
        const savedCourt = await CourtService.createCourt(court)

        const now = Date.now()
        const startTime1 = new Date(now - 2 * 60 * 60 * 1000)
        const endTime1 = new Date(now - 110 * 60 * 1000)
        const startTime2 = new Date(now - 60 * 60 * 1000)
        const endTime2 = new Date(now - 50 * 60 * 1000)

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
        const club = new Club("Aedes Padel", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123", "urlId")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court 1", "192.168.0.1", "/stream1", "encryptedPass1")
        const savedCourt = await CourtService.createCourt(court)

        const now = Date.now()
        const startTime1 = new Date(now - 2 * 60 * 60 * 1000)
        const endTime1 = new Date(now - 110 * 60 * 1000)
        const startTime2 = new Date(now - 60 * 60 * 1000)
        const endTime2 = new Date(now - 50 * 60 * 1000)

        const video1 = new Video(savedCourt.id!, "video1.mp4", startTime1, endTime1, "/example/path/video1.mp4")
        const video2 = new Video(savedCourt.id!, "video2.mp4", startTime2, endTime2, "/example/path/video2.mp4")

        await VideoService.createVideo(video1)
        const savedVideo2 = await VideoService.createVideo(video2)

        const fromDate = new Date(now - 90 * 60 * 1000)
        const toDate = new Date(now - 30 * 60 * 1000)

        const videos = await VideoService.getVideosBetweenDates(fromDate, toDate)

        expect(videos.length).toBeGreaterThanOrEqual(1)
        const videoFileNames = videos.map(v => v.fileName)
        expect(videoFileNames).toContain(savedVideo2.fileName)
    })

    test("debería obtener todos los videos entre 2 fechas para un court específico", async () => {
        const club = new Club("Aedes Padel", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123", "urlId")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court 1", "192.168.0.1", "/stream1", "encryptedPass1")
        const savedCourt = await CourtService.createCourt(court)

        const now = Date.now()
        const startTime1 = new Date(now - 2 * 60 * 60 * 1000)
        const endTime1 = new Date(now - 110 * 60 * 1000)
        const startTime2 = new Date(now - 60 * 60 * 1000)
        const endTime2 = new Date(now - 50 * 60 * 1000)

        const video1 = new Video(savedCourt.id!, "video1.mp4", startTime1, endTime1, "/example/path/video1.mp4")
        const video2 = new Video(savedCourt.id!, "video2.mp4", startTime2, endTime2, "/example/path/video2.mp4")

        await VideoService.createVideo(video1)
        const savedVideo2 = await VideoService.createVideo(video2)

        const fromDate = new Date(now - 90 * 60 * 1000)
        const toDate = new Date(now - 30 * 60 * 1000)

        const videos = await VideoService.getVideosBetweenDatesAndCourtId(fromDate, toDate, savedCourt.id!)

        expect(videos.length).toBeGreaterThanOrEqual(1)
        const videoFileNames = videos.map(v => v.fileName)
        expect(videoFileNames).toContain(savedVideo2.fileName)
    })

})