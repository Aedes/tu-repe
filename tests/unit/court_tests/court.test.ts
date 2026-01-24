import { Court } from "../../../src/models/Court"

test("debería crear una instancia de Court correctamente", () => {
    const court = new Court(1, "Court 1", "192.168.0.1", 554, "/stream1", "user1", "encryptedPass1")
    expect(court.clubId).toBe(1)
    expect(court.name).toBe("Court 1")
    expect(court.cameraHost).toBe("192.168.0.1")
    expect(court.cameraPort).toBe(554)
    expect(court.cameraPath).toBe("/stream1")
    expect(court.rtspUsername).toBe("user1")
})