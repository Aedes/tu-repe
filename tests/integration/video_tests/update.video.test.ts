import request from "supertest"
import { Club } from "../../../src/models/Club"
import { ClubService } from "../../../src/services/ClubService"
import { Court } from "../../../src/models/Court"
import { CourtService } from "../../../src/services/CourtService"
import { Video } from "../../../src/models/Video"
import { VideoService } from "../../../src/services/VideoService"
import { PORT } from "../../../src/config/config"

describe("PUT Video routes", () => {
    test("PUT /videos/v/:id - debería actualizar un video existente", async () => {
        const startTime = new Date("2024-01-01T13:00:00Z")
        const endTime = new Date("2024-01-01T13:10:00Z")

        const club = new Club("Club for Video Update", "09:00", "21:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court for Video Update", "192.168.0.1", "/stream1", "encryptedPass1")
        const savedCourt = await CourtService.createCourt(court)

        const video = new Video(savedCourt.id!, "video_to_update.mp4", startTime, endTime, "/example/path/video_to_update.mp4")
        const savedVideo = await VideoService.createVideo(video)

        const res = await request(`http://localhost:${PORT}`)
            .put(`/videos/v/${savedVideo.publicId}`)
            .send({
                fileName: "updated_video.mp4",
                startTime: "2024-01-01T14:00:00Z",
                endTime: "2024-01-01T14:10:00Z",
                b2FilePath: "/example/path/updated_video.mp4"
            })

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty("id", savedVideo.publicId)
        expect(res.body.fileName).toBe("updated_video.mp4")
        expect(new Date(res.body.startTime).toISOString()).toBe("2024-01-01T14:00:00.000Z")
        expect(new Date(res.body.endTime).toISOString()).toBe("2024-01-01T14:10:00.000Z")
        expect(res.body.b2FilePath).toBe("/example/path/updated_video.mp4")
    })
})