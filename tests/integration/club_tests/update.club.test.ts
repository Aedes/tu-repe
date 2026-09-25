import request from "supertest"
import { app } from "../../../src/app"
import { Club } from "../../../src/models/Club"
import { ClubService } from "../../../src/services/ClubService"
import { generateAdminToken } from "../../helpers/generateToken"

describe("PUT Club routes", () => {
    test("PUT /clubs/c/:id - debería actualizar un club existente", async () => {
        const token = await generateAdminToken()
        const club = new Club("Club To Update", "10:00", "20:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123", "urlId")
        const savedClub = await ClubService.createClub(club)

        const res = await request(app)
            .put(`/clubs/c/${savedClub.publicId}`)
            .set("Authorization", `Bearer ${token}`)
            .set("Cookie", "tu_repe_csrf=test-csrf-token")
            .set("X-CSRF-Token", "test-csrf-token")
            .send({
                name: "Updated Club Name",
                openTime: "11:00",
                closeTime: "21:00",
                appointmentDuration: 90,
                city: "Updated City",
                address: "Updated Address 456",
                phone: "2625660880",
                instagramHandle: "aedes.tech"
            })

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty("id", savedClub.publicId)
        expect(res.body.name).toBe("Updated Club Name")
        expect(res.body.openTime).toBe("11:00:00")
        expect(res.body.closeTime).toBe("21:00:00")
        expect(res.body.appointmentDuration).toBe(90)
        expect(res.body.city).toBe("Updated City")
        expect(res.body.address).toBe("Updated Address 456")
        expect(res.body.phone).toBe("2625660880")
        expect(res.body.instagramHandle).toBe("aedes.tech")
    })
})