import request from "supertest"
import { Club } from "../../../src/models/Club"
import { ClubService } from "../../../src/services/ClubService"
import { Court } from "../../../src/models/Court"
import { CourtService } from "../../../src/services/CourtService"
import { Video } from "../../../src/models/Video"
import { VideoService } from "../../../src/services/VideoService"
import { generateAdminToken } from "../../helpers/generateToken"
import { PORT } from "../../../src/config/config"

describe("DELETE Video routes", () => {
    test("DELETE /videos/v/:id - debería eliminar un video existente", async () => {
        const token = generateAdminToken()

        const club = new Club("Club for Video Deletion", "10:00", "20:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123", "urlId")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court for Video Deletion", "192.168.0.1", "/stream1", "encryptedPass1")
        const savedCourt = await CourtService.createCourt(court)

        const video = new Video(savedCourt.id!, "video_to_delete.mp4", new Date("2024-01-01T15:00:00Z"), new Date("2024-01-01T15:10:00Z"), "/example/path/video_to_delete")
        const savedVideo = await VideoService.createVideo(video)

        const deleteRes = await request(`http://localhost:${PORT}`)
            .delete(`/videos/v/${savedVideo.publicId}`)
            .set("Authorization", `Bearer ${token}`)

        expect(deleteRes.status).toBe(200)
        expect(deleteRes.body).toHaveProperty("message", "Video deleted successfully")

        const getRes = await request(`http://localhost:${PORT}`)
            .get(`/videos/v/${savedVideo.publicId}`)
        expect(getRes.status).toBe(404)
    })
})