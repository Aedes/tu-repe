import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"

describe("lectura de club", () => {
    test("debería obtener un club persistido en la base de datos por su id", async () => {
        const club = new Club("Aedes Padel", "08:00", "22:00", 60)
        const savedClub = await ClubService.createClub(club)

        const fetchedClub = await ClubService.findClubById(savedClub.id!)
        expect(fetchedClub).not.toBeNull()
        expect(fetchedClub?.id).toBe(savedClub.id)
        expect(fetchedClub?.name).toBe(savedClub.name)
        expect(fetchedClub?.openTime).toEqual(savedClub.openTime)
        expect(fetchedClub?.closeTime).toEqual(savedClub.closeTime)
    })

    test("debería obtener un club persistido en la base de datos por su nombre", async () => {
        const club = new Club("Aedes Padel", "08:00", "22:00", 60)
        const savedClub = await ClubService.createClub(club)

        const fetchedClub = await ClubService.findClubByName(savedClub.name)
        expect(fetchedClub).not.toBeNull()
        expect(fetchedClub?.id).toBe(savedClub.id)
        expect(fetchedClub?.name).toBe(savedClub.name)
        expect(fetchedClub?.openTime).toEqual(savedClub.openTime)
        expect(fetchedClub?.closeTime).toEqual(savedClub.closeTime)
    })

    test("debería obtener todos los clubs en la base de datos", async () => {
        const club1 = new Club("Aedes Padel", "08:00", "22:00", 60)
        const club2 = new Club("Beta Padel", "09:00", "21:00", 60)
        await ClubService.createClub(club1)
        await ClubService.createClub(club2)

        const clubs = await ClubService.getAllClubs()

        expect(clubs.length).toBeGreaterThanOrEqual(2)
        const clubNames = clubs.map(c => c.name)
        expect(clubNames).toContain("Aedes Padel")
        expect(clubNames).toContain("Beta Padel")
    })

    test("debería obtener todos los clubs en la base de datos con sus courts", async () => {
        const club1 = new Club("Aedes Padel", "08:00", "22:00", 60)
        const club2 = new Club("Beta Padel", "09:00", "21:00", 60)
        const savedClub1 = await ClubService.createClub(club1)
        const savedClub2 = await ClubService.createClub(club2)

        const court1 = new Court(savedClub1.id!, "Court 1", "rtsp://example.com/stream1")
        const court2 = new Court(savedClub2.id!, "Court 2", "rtsp://example.com/stream2")
        await CourtService.createCourt(court1)
        await CourtService.createCourt(court2)

        const clubsWithCourts = await ClubService.getAllClubsWithCourts()

        expect(clubsWithCourts.length).toBeGreaterThanOrEqual(2)
        const clubNames = clubsWithCourts.map(c => c.name)
        expect(clubNames).toContain("Aedes Padel")
        expect(clubNames).toContain("Beta Padel")
        expect(clubsWithCourts.find(c => c.name === "Aedes Padel")?.courts.length).toBeGreaterThanOrEqual(1)
        expect(clubsWithCourts.find(c => c.name === "Beta Padel")?.courts.length).toBeGreaterThanOrEqual(1)
        expect(clubsWithCourts.find(c => c.name === "Aedes Padel")?.courts[0].name).toBe("Court 1")
        expect(clubsWithCourts.find(c => c.name === "Beta Padel")?.courts[0].name).toBe("Court 2")
    })
})