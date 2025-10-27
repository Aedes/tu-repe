import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"

test("debería persistir una nueva cancha en la base de datos", async () => {
    const club = new Club("Aedes Padel", "08:00", "22:00")
    const savedClub = await ClubService.createClub(club)

    const court = new Court(savedClub.id!, "Court 1", "rtsp://example.com/stream")
    const savedCourt = await CourtService.createCourt(court)

    expect(savedCourt.id).toBeDefined()
    expect(savedCourt.clubId).toBe(savedClub.id)
    expect(savedCourt.name).toBe("Court 1")
    expect(savedCourt.rtspUrl).toBe("rtsp://example.com/stream")
})