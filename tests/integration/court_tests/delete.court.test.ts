import request from "supertest"
import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"

describe("DELETE Court routes", () => {
    test("DELETE /courts/c/:id - debería eliminar una cancha existente", async () => {
        const club = new Club("Club for Court Deletion", "09:00", "21:00")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court to Delete", "rtsp://example.com/courtdelete")
        const savedCourt = await CourtService.createCourt(court)

        const deleteRes = await request("http://localhost:5000")
            .delete(`/courts/c/${savedCourt.id}`)

        expect(deleteRes.status).toBe(200)
        expect(deleteRes.body).toHaveProperty("message", "Court deleted successfully")

        const getRes = await request("http://localhost:5000")
            .get(`/courts/c/${savedCourt.id}`)

        expect(getRes.status).toBe(404)
    })
})