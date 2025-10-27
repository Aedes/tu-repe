import { Court } from "../../../src/models/Court"

test("debería crear una instancia de Court correctamente", () => {
    const court = new Court(1, "Court 1", "rtsp://example.com/stream")
    expect(court.clubId).toBe(1)
    expect(court.name).toBe("Court 1")
    expect(court.rtspUrl).toBe("rtsp://example.com/stream")
})