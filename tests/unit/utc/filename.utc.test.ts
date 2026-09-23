import { extractMetadataFromFileName } from "../../../src/utils/extractMetadataFromFileName"
import { isTimeInRange, parseTime } from "../../../src/workers/recordingScheduler"

describe("UTC filename and schedule", () => {
    test("parsea filename como UTC", () => {
        const meta = extractMetadataFromFileName("cancha12_2026-01-15_21-30-00.mp4")
        expect(meta?.courtId).toBe(12)
        expect(meta?.startTime.toISOString()).toBe("2026-01-15T21:30:00.000Z")
    })

    test("rechaza filename inválido", () => {
        expect(extractMetadataFromFileName("video.mp4")).toBeNull()
    })

    test("horario overnight", () => {
        expect(isTimeInRange(parseTime("23:00"), parseTime("22:00"), parseTime("02:00"))).toBe(true)
        expect(isTimeInRange(parseTime("10:00"), parseTime("22:00"), parseTime("02:00"))).toBe(false)
    })
})
