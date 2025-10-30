import request from "supertest"
import { Club } from "../../../src/models/Club"
import { ClubService } from "../../../src/services/ClubService"

describe("DELETE Club routes", () => {
    test("DELETE /clubs/c/:id - debería eliminar un club existente", async () => {
        const club = new Club("Club to Delete", "10:00", "20:00")
        const savedClub = await ClubService.createClub(club)

        const deleteRes = await request("http://localhost:5000")
            .delete(`/clubs/c/${savedClub.id!}`)

        expect(deleteRes.status).toBe(200)
        expect(deleteRes.body).toHaveProperty("message", "Club deleted successfully")

        const getRes = await request("http://localhost:5000")
            .get(`/clubs/c/${savedClub.id!}`)

        expect(getRes.status).toBe(404)
    })
})