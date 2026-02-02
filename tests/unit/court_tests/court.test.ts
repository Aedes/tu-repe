import { Court } from "../../../src/models/Court"

test("debería crear una instancia de Court correctamente", () => {
    const court = new Court(1, "Court 1", "192.168.0.1", "/stream1", "encryptedPass1")
    expect(court.clubId).toBe(1)
    expect(court.name).toBe("Court 1")
    expect(court.cameraHost).toBe("192.168.0.1")
})