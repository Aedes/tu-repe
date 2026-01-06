import { Club } from "../../../src/models/Club"
import { ClubService } from "../../../src/services/ClubService"

test("debería actualizar un club correctamente", async () => {
    const club = new Club("Old Club Name", "08:00", "22:00", 60)
    const savedClub = await ClubService.createClub(club)

    savedClub.name = "New Club Name"
    savedClub.openTime = "09:00"
    savedClub.closeTime = "21:00"
    savedClub.appointmentDuration = 90

    const updatedClub = await ClubService.updateClub(savedClub.id!, savedClub)

    expect(updatedClub?.name).toBe("New Club Name")
    expect(updatedClub?.openTime).toEqual("09:00:00")
    expect(updatedClub?.closeTime).toEqual("21:00:00")
    expect(updatedClub?.appointmentDuration).toBe(90)
})