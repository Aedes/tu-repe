import request from "supertest"
import { Club } from "../../../src/models/Club"
import { ClubService } from "../../../src/services/ClubService"
import { Court } from "../../../src/models/Court"
import { CourtService } from "../../../src/services/CourtService"
import { Video } from "../../../src/models/Video"
import { VideoService } from "../../../src/services/VideoService"

describe("DELETE Video routes", () => {
    test("DELETE /videos/v/:id - debería eliminar un video existente", async () => {
        const club = new Club("Club for Video Deletion", "10:00", "20:00")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court for Video Deletion", "rtsp://example.com/courtforvideodeletion")
        const savedCourt = await CourtService.createCourt(court)

        const video = new Video(savedCourt.id!, "video_to_delete.mp4", new Date("2024-01-01T15:00:00Z"), new Date("2024-01-01T15:10:00Z"), "/example/path/video_to_delete")
        const savedVideo = await VideoService.createVideo(video)

        const deleteRes = await request("http://localhost:5000")
            .delete(`/videos/v/${savedVideo.id}`)

        expect(deleteRes.status).toBe(200)
        expect(deleteRes.body).toHaveProperty("message", "Video deleted successfully")

        const getRes = await request("http://localhost:5000")
            .get(`/videos/v/${savedVideo.id}`)
        expect(getRes.status).toBe(404)
    })
})