import request from "supertest"
import { Club } from "../../../src/models/Club"
import { ClubService } from "../../../src/services/ClubService"
import { Court } from "../../../src/models/Court"
import { CourtService } from "../../../src/services/CourtService"
import { PORT } from "../../../src/config/config"

describe("GET Club routes", () => {
    test("GET /clubs - debería obtener todos los clubs", async () => {
        const club1 = new Club("Club One", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const club2 = new Club("Club Two", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")

        await ClubService.createClub(club1)
        await ClubService.createClub(club2)

        const res = await request(`http://localhost:${PORT}`)
            .get("/clubs")

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body.length).toBeGreaterThanOrEqual(2)
    })

    test("GET /clubs/c/:id - debería obtener un club por ID", async () => {
        const club = new Club("Club By ID", "09:00", "21:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub = await ClubService.createClub(club)

        const res = await request(`http://localhost:${PORT}`)
            .get(`/clubs/c/${savedClub.publicId}`)

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty("id", savedClub.publicId)
        expect(res.body.name).toBe("Club By ID")
        expect(res.body.openTime).toBe("09:00:00")
        expect(res.body.closeTime).toBe("21:00:00")
        expect(res.body.appointmentDuration).toBe(60)
        expect(res.body.country).toBe("Argentina")
        expect(res.body.province).toBe("Mendoza")
        expect(res.body.city).toBe("San Rafael")
        expect(res.body.address).toBe("Calle Falsa 123")
    })

    test("GET /clubs/with-courts - debería obtener todos los clubs con sus canchas", async () => {
        const club1 = new Club("Club One", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const club2 = new Club("Club Two", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub1 = await ClubService.createClub(club1)
        const savedClub2 = await ClubService.createClub(club2)

        const court1 = new Court(savedClub1.id!, "Court 1", "192.168.0.1", "/stream1", "encryptedPass1")
        const court2 = new Court(savedClub2.id!, "Court 2", "192.168.0.2", "/stream1", "encryptedPass2")
        await CourtService.createCourt(court1)
        await CourtService.createCourt(court2)

        const res = await request(`http://localhost:${PORT}`)
            .get("/clubs/with-courts")

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body.length).toBeGreaterThanOrEqual(2)
        expect(res.body[0]).toHaveProperty("courts")
        expect(res.body[0].courts.length).toBeGreaterThanOrEqual(1)
        expect(res.body[0].courts[0]).toHaveProperty("name")
    })
})