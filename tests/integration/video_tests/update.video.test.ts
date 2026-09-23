import request from "supertest"
import { app } from "../../../src/app"
import { Club } from "../../../src/models/Club"
import { ClubService } from "../../../src/services/ClubService"
import { Court } from "../../../src/models/Court"
import { CourtService } from "../../../src/services/CourtService"
import { Video } from "../../../src/models/Video"
import { VideoService } from "../../../src/services/VideoService"
import { generateAdminToken } from "../../helpers/generateToken"

describe("PUT Video routes", () => {
    test("PUT /videos/v/:id - debería actualizar un video existente", async () => {
        const token = await generateAdminToken()
        const startTime = new Date("2024-01-01T13:00:00Z")
        const endTime = new Date("2024-01-01T13:10:00Z")
        const club = new Club("Club for Video Update", "09:00", "21:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123", "urlidclubxx")
        const savedClub = await ClubService.createClub(club)
        const savedCourt = await CourtService.createCourt(new Court(savedClub.id!, "Court for Video Update", "192.168.0.1", "/stream1", "encryptedPass1"))
        const savedVideo = await VideoService.createVideo(new Video(savedCourt.id!, "video_to_update.mp4", startTime, endTime, "/example/path/video_to_update.mp4"))
        const res = await request(app)
            .put(`/videos/v/${savedVideo.publicId}`)
            .set("Authorization", `Bearer ${token}`)
            .set("Cookie", "tu_repe_csrf=test-csrf-token")
            .set("X-CSRF-Token", "test-csrf-token")
            .send({
                fileName: "updated_video.mp4",
                startTime: "2024-01-01T14:00:00Z",
                endTime: "2024-01-01T14:10:00Z",
                b2FilePath: "/example/path/updated_video.mp4",
            })
        expect(res.status).toBe(200)
        expect(res.body.fileName).toBe("updated_video.mp4")
        expect(res.body.b2FilePath).toBeUndefined()
    })
})
