import request from "supertest"
import { app } from "../../../src/app"
import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { Video } from "../../../src/models/Video"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { VideoService } from "../../../src/services/VideoService"
import { generateAdminToken } from "../../helpers/generateToken"

describe("GET Videos routes", () => {
    test("GET /videos requiere admin y no expone b2FilePath", async () => {
        const token = await generateAdminToken()
        const club1 = new Club("Club One", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123", "urlidclubxx")
        const savedClub1 = await ClubService.createClub(club1)
        const savedCourt1 = await CourtService.createCourt(new Court(savedClub1.id!, "Court 1", "192.168.0.1", "/stream1", "encryptedPass1"))
        await VideoService.createVideo(new Video(savedCourt1.id!, "video1.mp4", new Date("2024-01-01T10:00:00Z"), new Date("2024-01-01T10:10:00Z"), "/example/path/video1.mp4"))
        const anon = await request(app).get("/videos")
        expect(anon.status).toBe(401)
        const res = await request(app).get("/videos").set("Authorization", `Bearer ${token}`)
        expect(res.status).toBe(200)
        expect(JSON.stringify(res.body)).not.toContain("/example/path/video1.mp4")
    })
})
