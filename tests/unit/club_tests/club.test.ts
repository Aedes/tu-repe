import { Club } from "../../../src/models/Club"

test("debería crear una instancia de Club correctamente", () => {
    const club = new Club("Aedes Padel", "08:00", "22:00", 60)
    expect(club.name).toBe("Aedes Padel")
    expect(club.openTime).toBe("08:00")
    expect(club.closeTime).toBe("22:00")
    expect(club.appointmentDuration).toBe(60)
})