import { Club } from "../../../src/models/Club"

test("debería crear una instancia de Club correctamente", () => {
    const club = new Club("Aedes Padel", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123", "2625660880", "aedes.tech", "Un pequeño complejo de clubes")
    expect(club.name).toBe("Aedes Padel")
    expect(club.openTime).toBe("08:00")
    expect(club.closeTime).toBe("22:00")
    expect(club.appointmentDuration).toBe(60)
    expect(club.country).toBe("Argentina")
    expect(club.province).toBe("Mendoza")
    expect(club.city).toBe("San Rafael")
    expect(club.address).toBe("Calle Falsa 123")
    expect(club.phone).toBe("2625660880")
    expect(club.instagramHandle).toBe("aedes.tech")
    expect(club.description).toBe("Un pequeño complejo de clubes")
})