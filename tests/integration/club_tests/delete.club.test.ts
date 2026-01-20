import request from "supertest"
import { Club } from "../../../src/models/Club"
import { ClubService } from "../../../src/services/ClubService"
import { Court } from "../../../src/models/Court"
import { CourtService } from "../../../src/services/CourtService"
import { Video } from "../../../src/models/Video"
import { VideoService } from "../../../src/services/VideoService"
import { generateAdminToken } from "../../helpers/generateToken"

describe("DELETE Club routes", () => {
    test("DELETE /clubs/c/:id - debería eliminar un club y sus canchas y videos asociados", async () => {
        const token = generateAdminToken()

        const club = new Club("Club to Delete with Courts and Videos", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court for Deletion", "rtsp://example.com/courtfordeletion")
        const savedCourt = await CourtService.createCourt(court)

        const video = new Video(savedCourt.id!, "video_for_deletion.mp4", new Date("2024-01-01T16:00:00Z"), new Date("2024-01-01T16:10:00Z"), "example/path/video_for_deletion")
        const savedVideo = await VideoService.createVideo(video)

        const deleteRes = await request("http://localhost:5000")
            .delete(`/clubs/c/${savedClub.id!}`)
            .set("Authorization", `Bearer ${token}`)

        expect(deleteRes.status).toBe(200)
        expect(deleteRes.body).toHaveProperty("message", "Club deleted successfully")

        const getClubRes = await request("http://localhost:5000")
            .get(`/clubs/c/${savedCourt.id}`)
        expect(getClubRes.status).toBe(404)

        const getCourtRes = await request("http://localhost:5000")
            .get(`/courts/c/${savedCourt.id}`)
        expect(getCourtRes.status).toBe(404)

        const getVideoRes = await request("http://localhost:5000")
            .get(`/videos/v/${savedVideo.id}`)
        expect(getVideoRes.status).toBe(404)
    })
})