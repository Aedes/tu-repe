import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"

describe("lectura de courts", () => {
    test("debería obtener un court persistido en la base de datos por su id", async () => {
        const club = new Club("Aedes Padel", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court 1", "192.168.0.1", 554, "/stream1", "user1", "encryptedPass1")
        const savedCourt = await CourtService.createCourt(court)

        const fetchedCourt = await CourtService.findCourtById(savedCourt.id!)
        expect(fetchedCourt).not.toBeNull()
        expect(fetchedCourt?.id).toBe(savedCourt.id)
        expect(fetchedCourt?.clubId).toBe(savedCourt.clubId)
        expect(fetchedCourt?.name).toBe(savedCourt.name)
        expect(fetchedCourt?.cameraHost).toBe("192.168.0.1")
        expect(fetchedCourt?.cameraPort).toBe(554)
        expect(fetchedCourt?.cameraPath).toBe("/stream1")
        expect(fetchedCourt?.rtspUsername).toBe("user1")
    })

    test("debería obtener un court persistido en la base de datos por su nombre y club", async () => {
        const club = new Club("Aedes Padel", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court 1", "192.168.0.1", 554, "/stream1", "user1", "encryptedPass1")
        const savedCourt = await CourtService.createCourt(court)

        const fetchedCourt = await CourtService.findCourtByNameAndClubId(savedCourt.name, savedCourt.clubId)
        expect(fetchedCourt).not.toBeNull()
        expect(fetchedCourt?.id).toBe(savedCourt.id)
        expect(fetchedCourt?.clubId).toBe(savedCourt.clubId)
        expect(fetchedCourt?.name).toBe(savedCourt.name)
        expect(fetchedCourt?.cameraHost).toBe("192.168.0.1")
        expect(fetchedCourt?.cameraPort).toBe(554)
        expect(fetchedCourt?.cameraPath).toBe("/stream1")
        expect(fetchedCourt?.rtspUsername).toBe("user1")
    })

    test("debería obtener todos los courts en la base de datos", async () => {
        const club = new Club("Aedes Padel", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub = await ClubService.createClub(club)

        const court1 = new Court(savedClub.id!, "Court 1", "192.168.0.1", 554, "/stream1", "user1", "encryptedPass1")
        const court2 = new Court(savedClub.id!, "Court 2", "192.168.0.2", 554, "/stream1", "user1", "encryptedPass1")
        await CourtService.createCourt(court1)
        await CourtService.createCourt(court2)

        const courts = await CourtService.getAllCourts()

        expect(courts.length).toBeGreaterThanOrEqual(2)
        const courtNames = courts.map(c => c.name)
        expect(courtNames).toContain("Court 1")
        expect(courtNames).toContain("Court 2")
    })

    test("debería obtener todos los courts de un club específico", async () => {
        const club1 = new Club("Aedes Padel", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const club2 = new Club("Beta Padel", "09:00", "21:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub1 = await ClubService.createClub(club1)
        const savedClub2 = await ClubService.createClub(club2)

        const court1 = new Court(savedClub1.id!, "Court 1", "192.168.0.1", 554, "/stream1", "user1", "encryptedPass1")
        const court2 = new Court(savedClub1.id!, "Court 2", "192.168.0.2", 554, "/stream1", "user1", "encryptedPass1")
        const court3 = new Court(savedClub2.id!, "Court 3", "192.168.0.3", 554, "/stream1", "user1", "encryptedPass1")
        await CourtService.createCourt(court1)
        await CourtService.createCourt(court2)
        await CourtService.createCourt(court3)

        const courtsOfClub1 = await CourtService.getCourtsByClubId(savedClub1.id!)

        expect(courtsOfClub1.length).toBeGreaterThanOrEqual(2)
        const courtNames = courtsOfClub1.map(c => c.name)
        expect(courtNames).toContain("Court 1")
        expect(courtNames).toContain("Court 2")
        expect(courtNames).not.toContain("Court 3")
    })
})