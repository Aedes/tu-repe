import request from "supertest"
import { Court } from "../../../src/models/Court"
import { CourtService } from "../../../src/services/CourtService"
import { Club } from "../../../src/models/Club"
import { ClubService } from "../../../src/services/ClubService"
import { generateAdminToken } from "../../helpers/generateToken"
import { PORT } from "../../../src/config/config"

describe("PUT Court routes", () => {
    test("PUT /courts/c/:id - debería actualizar una cancha existente por parte del perfil del usuario", async () => {
        const club = new Club("Club for Court Update", "09:00", "21:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court To Update", "192.168.0.1", "/stream1", "encryptedPass1")
        const savedCourt = await CourtService.createCourt(court)

        const res = await request(`http://localhost:${PORT}`)
            .put(`/courts/c/${savedCourt.publicId}`)
            .send({
                name: "Updated Court Name",
            })

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty("id", savedCourt.publicId)
        expect(res.body.name).toBe("Updated Court Name")
    })

    test("PUT /courts/c/:id - no debería cambiar campos que no sean el name por parte del perfil del usuario", async () => {
        const club = new Club("Club for Court Update", "09:00", "21:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court To Update", "192.168.0.1", "/stream1", "encryptedPass1")
        const savedCourt = await CourtService.createCourt(court)

        const res = await request(`http://localhost:${PORT}`)
            .put(`/courts/c/${savedCourt.publicId}`)
            .send({
                name: "Updated Court Name",
                cameraHost: "192.168.0.2",
            })

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty("id", savedCourt.publicId)
        expect(res.body.name).toBe("Updated Court Name")
        expect(res.body.cameraHost).toBe("192.168.0.1")
    })

    test("PUT /courts/c/:id/admin - debería actualizar una cancha existente por parte del administrador", async () => {
        const token = generateAdminToken()
        const club = new Club("Club for Court Update", "09:00", "21:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court To Update", "192.168.0.1", "/stream1", "encryptedPass1")
        const savedCourt = await CourtService.createCourt(court)

        const res = await request(`http://localhost:${PORT}`)
            .put(`/courts/c/${savedCourt.publicId}/admin`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                name: "Updated Court Name",
                cameraHost: "192.168.0.2",
            })

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty("id", savedCourt.publicId)
        expect(res.body.name).toBe("Updated Court Name")
        expect(res.body.cameraHost).toBe("192.168.0.2")
    })
})