import request from "supertest"
import { app } from "../../../src/app"
import { Court } from "../../../src/models/Court"
import { Club } from "../../../src/models/Club"
import { CourtService } from "../../../src/services/CourtService"
import { ClubService } from "../../../src/services/ClubService"
import { generateAdminToken } from "../../helpers/generateToken"

describe("GET Court routes", () => {
    test("GET /courts requiere admin", async () => {
        const token = await generateAdminToken()
        const club1 = new Club("Club One", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123", "urlid1club")
        const savedClub1 = await ClubService.createClub(club1)
        await CourtService.createCourt(new Court(savedClub1.id!, "Court 1", "192.168.0.1", "/club1/cancha1_streamKey1", "streamKey1"))
        const anon = await request(app).get("/courts")
        expect(anon.status).toBe(401)
        const res = await request(app).get("/courts").set("Authorization", `Bearer ${token}`)
        expect(res.status).toBe(200)
        expect(JSON.stringify(res.body)).not.toContain("streamKey1")
    })

    test("GET /courts/c/:id no expone streamKey", async () => {
        const token = await generateAdminToken()
        const club = new Club("Club By ID", "09:00", "21:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123", "urlidclubxx")
        const savedClub = await ClubService.createClub(club)
        const savedCourt = await CourtService.createCourt(new Court(savedClub.id!, "Court By ID", "192.168.0.1", "/path1", "streamKey1"))
        const res = await request(app).get(`/courts/c/${savedCourt.publicId}`).set("Authorization", `Bearer ${token}`)
        expect(res.status).toBe(200)
        expect(res.body.name).toBe("Court By ID")
        expect(res.body.streamKey).toBeUndefined()
    })

    test("GET /courts/c/:id/publish-target devuelve la ruta vigente solo al admin", async () => {
        const token = await generateAdminToken()
        const club = new Club("Club Path", "09:00", "21:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123", "urlidpath01")
        const savedClub = await ClubService.createClub(club)
        const savedCourt = await CourtService.createCourt(new Court(savedClub.id!, "Court Path", "192.168.0.1", "club_9/cancha1_abc", "cancha1_abc"))
        const anon = await request(app).get(`/courts/c/${savedCourt.publicId}/publish-target`)
        expect(anon.status).toBe(401)
        const res = await request(app).get(`/courts/c/${savedCourt.publicId}/publish-target`).set("Authorization", `Bearer ${token}`)
        expect(res.status).toBe(200)
        expect(res.body).toEqual({
            cameraPath: "club_9/cancha1_abc",
            streamKey: "cancha1_abc",
        })
    })
})
