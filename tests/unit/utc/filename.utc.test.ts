import { extractMetadataFromFileName } from "../../../src/utils/extractMetadataFromFileName"
import { argentinaWallClock } from "../../../src/utils/argentinaTime"
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

    test("compara apertura y cierre contra la hora de Argentina", () => {
        const elevenArgentina = new Date("2026-09-23T14:00:00.000Z")
        const nineArgentina = new Date("2026-09-23T12:00:00.000Z")
        expect(argentinaWallClock(elevenArgentina)).toBe("11:00")
        expect(argentinaWallClock(nineArgentina)).toBe("09:00")
        expect(isTimeInRange(parseTime(argentinaWallClock(nineArgentina)), parseTime("08:00"), parseTime("09:00"))).toBe(false)
        expect(isTimeInRange(parseTime(argentinaWallClock(new Date("2026-09-23T11:59:00.000Z"))), parseTime("08:00"), parseTime("09:00"))).toBe(true)
        expect(argentinaWallClock(new Date("2026-09-24T02:30:00.000Z"))).toBe("23:30")
        expect(argentinaWallClock(new Date("2026-09-24T03:00:00.000Z"))).toBe("00:00")
    })
})
