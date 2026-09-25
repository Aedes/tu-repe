import request from "supertest"
import { app } from "../../../src/app"
import { Court } from "../../../src/models/Court"
import { CourtService } from "../../../src/services/CourtService"
import { Club } from "../../../src/models/Club"
import { ClubService } from "../../../src/services/ClubService"
import { generateAdminToken } from "../../helpers/generateToken"

describe("PUT Court routes", () => {
    test("PUT /courts/c/:id público ahora es 401 o 404", async () => {
        const club = new Club("Club for Court Update", "09:00", "21:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123", "urlidclubxx")
        const savedClub = await ClubService.createClub(club)
        const savedCourt = await CourtService.createCourt(new Court(savedClub.id!, "Court To Update", "192.168.0.1", "/stream1", "encryptedPass1"))
        const res = await request(app).put(`/courts/c/${savedCourt.publicId}`).send({ name: "Updated Court Name" })
        expect([401, 403, 404]).toContain(res.status)
    })

    test("PUT /courts/c/:id - no debería cambiar campos que no sean el name por parte del perfil del usuario", async () => {
        const club = new Club("Club for Court Update", "09:00", "21:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123", "urlId")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court To Update", "192.168.0.1", "/stream1", "encryptedPass1")
        const savedCourt = await CourtService.createCourt(court)

        const res = await request(app)
            .put(`/courts/c/${savedCourt.publicId}`)
            .send({
                name: "Updated Court Name",
                cameraHost: "192.168.0.2",
            })

        expect([401, 403, 404]).toContain(res.status)
    })

    test("PUT /courts/c/:id/admin - debería actualizar una cancha existente por parte del administrador", async () => {
        const token = await generateAdminToken()
        const club = new Club("Club for Court Update", "09:00", "21:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123", "urlId")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court To Update", "192.168.0.1", "/stream1", "encryptedPass1")
        const savedCourt = await CourtService.createCourt(court)

        const res = await request(app)
            .put(`/courts/c/${savedCourt.publicId}/admin`)
            .set("Authorization", `Bearer ${token}`)
            .set("Cookie", "tu_repe_csrf=test-csrf-token")
            .set("X-CSRF-Token", "test-csrf-token")
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