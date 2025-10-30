import request from "supertest"
import { Club } from "../../../src/models/Club"
import { ClubService } from "../../../src/services/ClubService"

describe("PUT Club routes", () => {
    test("PUT /clubs/c/:id - debería actualizar un club existente", async () => {
        const club = new Club("Club To Update", "10:00", "20:00")
        const savedClub = await ClubService.createClub(club)

        const res = await request("http://localhost:5000")
            .put(`/clubs/c/${savedClub.id}`)
            .send({
                name: "Updated Club Name",
                openTime: "11:00",
                closeTime: "21:00"
            })

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty("id", savedClub.id)
        expect(res.body.name).toBe("Updated Club Name")
        expect(res.body.openTime).toBe("11:00:00")
        expect(res.body.closeTime).toBe("21:00:00")
    })
})