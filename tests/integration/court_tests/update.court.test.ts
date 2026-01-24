import request from "supertest"
import { Court } from "../../../src/models/Court"
import { CourtService } from "../../../src/services/CourtService"
import { Club } from "../../../src/models/Club"
import { ClubService } from "../../../src/services/ClubService"
import { generateAdminToken } from "../../helpers/generateToken"

describe("PUT Court routes", () => {
    test("PUT /courts/c/:id - debería actualizar una cancha existente por parte del perfil del usuario", async () => {
        const club = new Club("Club for Court Update", "09:00", "21:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court To Update", "192.168.0.1", 554, "/stream1", "user1", "encryptedPass1")
        const savedCourt = await CourtService.createCourt(court)

        const res = await request("http://localhost:5000")
            .put(`/courts/c/${savedCourt.id}`)
            .send({
                name: "Updated Court Name",
            })

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty("id", savedCourt.id)
        expect(res.body.name).toBe("Updated Court Name")
    })

    test("PUT /courts/c/:id - no debería cambiar campos que no sean el name por parte del perfil del usuario", async () => {
        const club = new Club("Club for Court Update", "09:00", "21:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court To Update", "192.168.0.1", 554, "/stream1", "user1", "encryptedPass1")
        const savedCourt = await CourtService.createCourt(court)

        const res = await request("http://localhost:5000")
            .put(`/courts/c/${savedCourt.id}`)
            .send({
                name: "Updated Court Name",
                cameraHost: "192.168.0.2",
                cameraPort: 555,
                cameraPath: "/updated-path",
                rtspUsername: "user2",
            })

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty("id", savedCourt.id)
        expect(res.body.name).toBe("Updated Court Name")
        expect(res.body.cameraHost).toBe("192.168.0.1")
        expect(res.body.cameraPort).toBe(554)
        expect(res.body.cameraPath).toBe("/stream1")
        expect(res.body.rtspUsername).toBe("user1")
    })

    test("PUT /courts/c/:id/admin - debería actualizar una cancha existente por parte del administrador", async () => {
        const token = generateAdminToken()
        const club = new Club("Club for Court Update", "09:00", "21:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court To Update", "192.168.0.1", 554, "/stream1", "user1", "encryptedPass1")
        const savedCourt = await CourtService.createCourt(court)

        const res = await request("http://localhost:5000")
            .put(`/courts/c/${savedCourt.id}/admin`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                name: "Updated Court Name",
                cameraHost: "192.168.0.2",
                cameraPort: 555,
                cameraPath: "/updated-path",
                rtspUsername: "user2",
            })

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty("id", savedCourt.id)
        expect(res.body.name).toBe("Updated Court Name")
        expect(res.body.cameraHost).toBe("192.168.0.2")
        expect(res.body.cameraPort).toBe(555)
        expect(res.body.cameraPath).toBe("/updated-path")
        expect(res.body.rtspUsername).toBe("user2")
    })
})