import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { config } from "../../../src/config/config"
import fs from "fs"
import path from "path"

test("debería persistir una nueva cancha en la base de datos y crear los directorios para esta", async () => {
    const club = new Club("Aedes Padel", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123", "urlId")
    const savedClub = await ClubService.createClub(club)

    const court = new Court(savedClub.id!, "Court 1", "192.168.0.1", "/stream1", "encryptedPass1")
    const savedCourt = await CourtService.createCourt(court)

    const clubPath = path.join(config.VIDEO_DIR, `club_${savedClub.id}`)
    const courtPath = path.join(clubPath, `court_${savedCourt.id}`)

    expect(fs.existsSync(clubPath)).toBe(true)
    expect(fs.existsSync(courtPath)).toBe(true)

    expect(savedCourt.id).toBeDefined()
    expect(savedCourt.clubId).toBe(savedClub.id)
    expect(savedCourt.name).toBe("Court 1")
    expect(savedCourt.cameraHost).toBe("192.168.0.1")
})