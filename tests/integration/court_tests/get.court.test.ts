import request from "supertest"
import { Court } from "../../../src/models/Court"
import { Club } from "../../../src/models/Club"
import { CourtService } from "../../../src/services/CourtService"
import { ClubService } from "../../../src/services/ClubService"
import { PORT } from "../../../src/config/config"

describe("GET Court routes", () => {
    test("GET /courts - debería obtener todas las canchas", async () => {
        const club1 = new Club("Club One", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const club2 = new Club("Club Two", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub1 = await ClubService.createClub(club1)
        const savedClub2 = await ClubService.createClub(club2)

        const court1 = new Court(savedClub1.id!, "Court 1", "192.168.0.1", "/club1/cancha1_streamKey1", "streamKey1")
        const court2 = new Court(savedClub2.id!, "Court 2", "192.168.0.2", "/club2/cancha2_streamKey2", "streamKey2")
        await CourtService.createCourt(court1)
        await CourtService.createCourt(court2)

        const res = await request(`http://localhost:${PORT}`)
            .get("/courts")

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body.length).toBeGreaterThanOrEqual(2)
    })

    test("GET /courts/c/:id - debería obtener una cancha por id", async () => {
        const club = new Club("Club By ID", "09:00", "21:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court By ID", "192.168.0.1", "/path1", "streamKey1")
        const savedCourt = await CourtService.createCourt(court)

        const res = await request(`http://localhost:${PORT}`)
            .get(`/courts/c/${savedCourt.id}`)

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty("id", savedCourt.id)
        expect(res.body.name).toBe("Court By ID")
        expect(res.body.cameraHost).toBe("192.168.0.1")
        expect(res.body.cameraPath).toBe("/path1")
        expect(res.body.streamKey).toBe("streamKey1")
    })

    test("GET /courts/cl/:id - debería obtener todas las canchas de un club", async () => {
        const club = new Club("Club With Courts", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub = await ClubService.createClub(club)

        const court1 = new Court(savedClub.id!, "Court 1", "192.168.0.1", "/stream1", "streamKey1")
        const court2 = new Court(savedClub.id!, "Court 2", "192.168.0.2", "/stream2", "streamKey2")
        await CourtService.createCourt(court1)
        await CourtService.createCourt(court2)

        const res = await request(`http://localhost:${PORT}`)
            .get(`/courts/cl/${savedClub.id}`)

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body.length).toBeGreaterThanOrEqual(2)
        expect(res.body[0]).toHaveProperty("clubId", savedClub.id)
    })
})