import request from "supertest"
import { Club } from "../../../src/models/Club"
import { ClubService } from "../../../src/services/ClubService"

describe("PUT Club routes", () => {
    test("PUT /clubs/c/:id - debería actualizar un club existente", async () => {
        const club = new Club("Club To Update", "10:00", "20:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub = await ClubService.createClub(club)

        const res = await request("http://localhost:5000")
            .put(`/clubs/c/${savedClub.id}`)
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
        expect(res.body).toHaveProperty("id", savedClub.id)
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