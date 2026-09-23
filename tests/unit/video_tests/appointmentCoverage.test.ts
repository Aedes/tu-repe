import { assessAppointmentCoverage } from "../../../src/services/appointmentCoverage"
import { IVideo } from "../../../src/types"

const video = (startMinutes: number, endMinutes: number, id = startMinutes): IVideo => ({
    id,
    courtId: 1,
    fileName: `${id}.mp4`,
    b2FilePath: `club_1/court_1/${id}.mp4`,
    startTime: new Date(startMinutes * 60 * 1000),
    endTime: new Date(endMinutes * 60 * 1000),
    status: "available",
    expiresAt: new Date(Date.now() + 60_000),
})

describe("cobertura de un turno", () => {
    const start = new Date(0)
    const end = new Date(90 * 60 * 1000)
    const tolerance = 10_000

    test("seis fragmentos continuos cubren 90 minutos", () => {
        const videos = [0, 15, 30, 45, 60, 75].map((minute) => video(minute, minute + 15))
        const result = assessAppointmentCoverage(videos, start, end, tolerance)
        expect(result.kind).toBe("complete")
        if (result.kind === "complete") expect(result.videos).toHaveLength(6)
    })

    test("tolera un hueco menor a 10 segundos", () => {
        const first = video(0, 15)
        const second = video(15, 30)
        second.startTime = new Date(15 * 60 * 1000 + 5_000)
        const result = assessAppointmentCoverage([second, first], start, new Date(30 * 60 * 1000), tolerance)
        expect(result.kind).toBe("complete")
    })

    test("un hueco mayor queda como respaldo", () => {
        const result = assessAppointmentCoverage(
            [video(0, 15), video(16, 31)],
            start,
            new Date(30 * 60 * 1000),
            tolerance
        )
        expect(result.kind).toBe("fallback")
    })

    test("sin fragmentos no hay partido", () => {
        expect(assessAppointmentCoverage([], start, end, tolerance).kind).toBe("not_found")
    })

    test("un único fragmento que cubre el turno es completo", () => {
        const result = assessAppointmentCoverage([video(0, 90)], start, end, tolerance)
        expect(result.kind).toBe("complete")
    })
})
