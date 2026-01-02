import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import fs from "fs"
import path from "path"

test("debería persistir una nueva cancha en la base de datos y crear los directorios para esta", async () => {
    const club = new Club("Aedes Padel", "08:00", "22:00")
    const savedClub = await ClubService.createClub(club)

    const court = new Court(savedClub.id!, "Court 1", "rtsp://example.com/stream")
    const savedCourt = await CourtService.createCourt(court)

    const clubPath = path.join("/var/videos", `club_${savedClub.id}`)
    const courtPath = path.join(clubPath, `court_${savedCourt.id}`)

    expect(fs.existsSync(clubPath)).toBe(true)
    expect(fs.existsSync(courtPath)).toBe(true)

    expect(savedCourt.id).toBeDefined()
    expect(savedCourt.clubId).toBe(savedClub.id)
    expect(savedCourt.name).toBe("Court 1")
    expect(savedCourt.rtspUrl).toBe("rtsp://example.com/stream")
})