import request from "supertest"
import { app } from "../../../src/app"
import { Club } from "../../../src/models/Club"
import { ClubService } from "../../../src/services/ClubService"
import { Court } from "../../../src/models/Court"
import { CourtService } from "../../../src/services/CourtService"
import { Video } from "../../../src/models/Video"
import { VideoService } from "../../../src/services/VideoService"
import { generateAdminToken } from "../../helpers/generateToken"

describe("DELETE Club routes", () => {
    test("DELETE /clubs/c/:id - debería eliminar un club y sus canchas y videos asociados", async () => {
        const token = await generateAdminToken()

        const club = new Club("Club to Delete with Courts and Videos", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123", "urlId")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court for Deletion", "192.168.0.1", "/stream1", "encryptedPass1")
        const savedCourt = await CourtService.createCourt(court)

        const video = new Video(savedCourt.id!, "video_for_deletion.mp4", new Date("2024-01-01T16:00:00Z"), new Date("2024-01-01T16:10:00Z"), "example/path/video_for_deletion")
        const savedVideo = await VideoService.createVideo(video)

        const deleteRes = await request(app)
            .delete(`/clubs/c/${savedClub.publicId!}`)
            .set("Authorization", `Bearer ${token}`)
            .set("Cookie", "tu_repe_csrf=test-csrf-token")
            .set("X-CSRF-Token", "test-csrf-token")

        expect(deleteRes.status).toBe(200)
        expect(deleteRes.body).toHaveProperty("message", "Club deleted successfully")

        const getClubRes = await request(app)
            .get(`/clubs/c/${savedClub.publicId}`)
        expect(getClubRes.status).toBe(404)

        const getCourtRes = await request(app)
            .get(`/courts/c/${savedCourt.publicId}`)
            .set("Authorization", `Bearer ${token}`)
        expect(getCourtRes.status).toBe(404)

        const getVideoRes = await request(app)
            .get(`/videos/v/${savedVideo.publicId}`)
            .set("Authorization", `Bearer ${token}`)
        expect(getVideoRes.status).toBe(404)
    })
})