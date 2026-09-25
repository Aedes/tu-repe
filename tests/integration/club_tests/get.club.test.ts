import request from "supertest"
import { app } from "../../../src/app"
import { Club } from "../../../src/models/Club"
import { ClubService } from "../../../src/services/ClubService"
import { Court } from "../../../src/models/Court"
import { CourtService } from "../../../src/services/CourtService"
import { generateAdminToken } from "../../helpers/generateToken"

describe("GET Club routes", () => {
    test("GET /clubs - debería obtener todos los clubs", async () => {
        const club1 = new Club("Club One", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123", "urlid1club")
        const club2 = new Club("Club Two", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123", "urlid2club")
        await ClubService.createClub(club1)
        await ClubService.createClub(club2)
        const res = await request(app).get("/clubs")
        expect(res.status).toBe(200)
        expect(res.body.length).toBeGreaterThanOrEqual(2)
        expect(JSON.stringify(res.body)).not.toMatch(/streamKey|b2FilePath/)
    })

    test("GET /clubs/c/:id - debería obtener un club por ID", async () => {
        const club = new Club("Club By ID", "09:00", "21:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123", "urlidclubxx")
        const savedClub = await ClubService.createClub(club)
        const res = await request(app).get(`/clubs/c/${savedClub.publicId}`)
        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty("id", savedClub.publicId)
        expect(res.body.name).toBe("Club By ID")
    })

    test("GET /clubs/with-courts requiere admin y no filtra streamKey", async () => {
        const token = await generateAdminToken()
        const club1 = new Club("Club One", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123", "urlid1club")
        const savedClub1 = await ClubService.createClub(club1)
        await CourtService.createCourt(new Court(savedClub1.id!, "Court 1", "192.168.0.1", "/stream1", "encryptedPass1"))
        const res = await request(app).get("/clubs/with-courts").set("Authorization", `Bearer ${token}`)
        expect(res.status).toBe(200)
        expect(res.body[0]).toHaveProperty("courts")
        expect(JSON.stringify(res.body)).not.toContain("encryptedPass1")
    })
})
