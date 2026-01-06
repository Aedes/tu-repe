import { Club } from "../../../src/models/Club"
import { ClubService } from "../../../src/services/ClubService"

test("debería persistir un nuevo club en la base de datos", async () => {
    const club = new Club("Aedes Padel", "08:00", "22:00", 60)
    const savedClub = await ClubService.createClub(club)

    expect(savedClub.id).toBeDefined()
    expect(savedClub.name).toBe("Aedes Padel")
    expect(savedClub.openTime).toBe("08:00:00")
    expect(savedClub.closeTime).toBe("22:00:00")
    expect(savedClub.appointmentDuration).toBe(60)
})