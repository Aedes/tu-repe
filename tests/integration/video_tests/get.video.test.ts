import request from "supertest"
import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { Video } from "../../../src/models/Video"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { VideoService } from "../../../src/services/VideoService"
import { PORT } from "../../../src/config/config"

describe("GET Videos routes", () => {
    test("GET /videos - debería obtener todos los videos", async () => {
        const startTime1 = new Date("2024-01-01T10:00:00Z")
        const endTime1 = new Date("2024-01-01T10:10:00Z")
        const startTime2 = new Date("2024-01-01T11:00:00Z")
        const endTime2 = new Date("2024-01-01T11:10:00Z")

        const club1 = new Club("Club One", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub1 = await ClubService.createClub(club1)

        const court1 = new Court(savedClub1.id!, "Court 1", "192.168.0.1", "/stream1", "encryptedPass1")
        const savedCourt1 = await CourtService.createCourt(court1)

        const video1 = new Video(savedCourt1.id!, "video1.mp4", startTime1, endTime1, "/example/path/video1.mp4")
        const video2 = new Video(savedCourt1.id!, "video2.mp4", startTime2, endTime2, "/example/path/video2.mp4")

        await VideoService.createVideo(video1)
        await VideoService.createVideo(video2)

        const res = await request(`http://localhost:${PORT}`)
            .get("/videos")

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body.length).toBeGreaterThanOrEqual(2)
    })

    test("GET /videos/v/:id - debería obtener un video por id", async () => {
        const startTime = new Date("2024-01-01T11:00:00Z")
        const endTime = new Date("2024-01-01T11:10:00Z")

        const club2 = new Club("Club Two", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub2 = await ClubService.createClub(club2)

        const court2 = new Court(savedClub2.id!, "Court 2", "192.168.0.1", "/stream1", "encryptedPass1")
        const savedCourt2 = await CourtService.createCourt(court2)

        const video = new Video(savedCourt2.id!, "video_by_id.mp4", startTime, endTime, "/example/path/video_by_id.mp4")
        const savedVideo = await VideoService.createVideo(video)

        const res = await request(`http://localhost:${PORT}`)
            .get(`/videos/v/${savedVideo.id}`)

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty("id", savedVideo.id)
        expect(res.body.fileName).toBe("video_by_id.mp4")
        expect(res.body.b2FilePath).toBe("/example/path/video_by_id.mp4")
    })

    test("GET /videos/c/:id - debería devolver los videos de una cancha", async () => {
        const startTime1 = new Date("2024-01-01T10:00:00Z")
        const endTime1 = new Date("2024-01-01T10:10:00Z")
        const startTime2 = new Date("2024-01-01T11:00:00Z")
        const endTime2 = new Date("2024-01-01T11:10:00Z")

        const club3 = new Club("Club Three", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub3 = await ClubService.createClub(club3)

        const court3 = new Court(savedClub3.id!, "Court 3", "192.168.0.1", "/stream1", "encryptedPass1")
        const savedCourt3 = await CourtService.createCourt(court3)

        const video1 = new Video(savedCourt3.id!, "court3_video1.mp4", startTime1, endTime1, "/example/path/court3_video1.mp4")
        const video2 = new Video(savedCourt3.id!, "court3_video2.mp4", startTime2, endTime2, "/example/path/court3_video2.mp4")

        await VideoService.createVideo(video1)
        await VideoService.createVideo(video2)

        const res = await request(`http://localhost:${PORT}`)
            .get(`/videos/c/${savedCourt3.id}`)

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body.length).toBeGreaterThanOrEqual(2)
        expect(res.body[0]).toHaveProperty("courtId", savedCourt3.id)
    })

    test("GET /videos/range?startDate=&endDate=$courtId - debería devolver los videos de una cancha entre dos fechas", async () => {
        const startTime1 = new Date("2024-02-01T10:00:00Z")
        const endTime1 = new Date("2024-02-01T10:10:00Z")
        const startTime2 = new Date("2024-02-05T10:00:00Z")
        const endTime2 = new Date("2024-02-05T10:10:00Z")

        const club4 = new Club("Club Four", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub4 = await ClubService.createClub(club4)

        const court4 = new Court(savedClub4.id!, "Court 4", "192.168.0.1", "/stream1", "encryptedPass1")
        const savedCourt4 = await CourtService.createCourt(court4)

        const video1 = new Video(savedCourt4.id!, "date_video1.mp4", startTime1, endTime1, "/example/path/date_video1")
        const video2 = new Video(savedCourt4.id!, "date_video2.mp4", startTime2, endTime2, "/example/path/date_video2")

        await VideoService.createVideo(video1)
        await VideoService.createVideo(video2)

        const res = await request(`http://localhost:${PORT}`)
            .get(`/videos/range`)
            .query({ startTime: "2024-02-01", endTime: "2024-02-03", courtId: savedCourt4.id })

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body.length).toBeGreaterThanOrEqual(1)
        expect(new Date(res.body[0].startTime) >= startTime1).toBe(true)
        expect(new Date(res.body[0].endTime) <= endTime1).toBe(true)
    })
})