import { Club } from "../../../src/models/Club"
import { ClubService } from "../../../src/services/ClubService"

test("debería actualizar un club correctamente", async () => {
    const club = new Club("Old Club Name", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
    const savedClub = await ClubService.createClub(club)

    savedClub.name = "New Club Name"
    savedClub.openTime = "09:00"
    savedClub.closeTime = "21:00"
    savedClub.appointmentDuration = 90
    savedClub.country = "Chile"
    savedClub.province = "Santiago"
    savedClub.city = "Providencia"
    savedClub.address = "Avenida Siempre Viva 742"

    const updatedClub = await ClubService.updateClub(savedClub.id!, savedClub)

    expect(updatedClub?.name).toBe("New Club Name")
    expect(updatedClub?.openTime).toEqual("09:00:00")
    expect(updatedClub?.closeTime).toEqual("21:00:00")
    expect(updatedClub?.appointmentDuration).toBe(90)
    expect(updatedClub?.country).toBe("Chile")
    expect(updatedClub?.province).toBe("Santiago")
    expect(updatedClub?.city).toBe("Providencia")
    expect(updatedClub?.address).toBe("Avenida Siempre Viva 742")
})