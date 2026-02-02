import request from "supertest"
import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { Video } from "../../../src/models/Video"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { VideoService } from "../../../src/services/VideoService"
import fs from "fs"
import { generateAdminToken } from "../../helpers/generateToken"
import { PORT } from "../../../src/config/config"

describe("DELETE Court routes", () => {
    test("DELETE /courts/c/:id - debería eliminar una cancha existente, sus videos asociados y los directorios de la misma", async () => {
        const token = generateAdminToken()

        const club = new Club("Club for Court Deletion", "09:00", "21:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court to Delete", "192.168.0.1", "/stream1", "encryptedPass1")
        const savedCourt = await CourtService.createCourt(court)

        const video = new Video(savedCourt.id!, "video_for_deletion.mp4", new Date("2024-01-01T16:00:00Z"), new Date("2024-01-01T16:10:00Z"), "/example/path/video_for_deletion")
        const savedVideo = await VideoService.createVideo(video)

        const deleteRes = await request(`http://localhost:${PORT}`)
            .delete(`/courts/c/${savedCourt.id}`)
            .set("Authorization", `Bearer ${token}`)

        expect(deleteRes.status).toBe(200)
        expect(deleteRes.body).toHaveProperty("message", "Court deleted successfully")

        const getCourtRes = await request(`http://localhost:${PORT}`)
            .get(`/courts/c/${savedCourt.id}`)

        expect(getCourtRes.status).toBe(404)

        const getVideoRes = await request(`http://localhost:${PORT}`)
            .get(`/videos/v/${savedVideo.id}`)
        expect(getVideoRes.status).toBe(404)

        const getClubRes = await request(`http://localhost:${PORT}`)
            .get(`/clubs/c/${savedClub.id!}`)
        expect(getClubRes.status).toBe(200)

        const courtPath = `/var/videos/club_${savedClub.id}/court_${savedCourt.id}`
        expect(fs.existsSync(courtPath)).toBe(false)
    })
})