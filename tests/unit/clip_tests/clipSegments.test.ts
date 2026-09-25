import { ClipSegmentError, planClipSegments, ClipSource } from "../../../src/services/clipSegments"

const at = (ms: number) => new Date(ms)
const video = (id: number, start: number, end: number): ClipSource => ({
    id,
    b2FilePath: `club_1/court_1/${id}.mp4`,
    startTime: at(start),
    endTime: at(end),
})

const plan = (videos: ClipSource[], start: number, end: number, tolerance = 1_000) =>
    planClipSegments(videos, at(start), at(end), tolerance)

describe("planClipSegments", () => {
    test("recorta un rango dentro de un fragmento", () => {
        expect(plan([video(1, 0, 60_000)], 5_000, 12_000)).toEqual([{
            videoId: 1,
            b2FilePath: "club_1/court_1/1.mp4",
            localStartMs: 5_000,
            durationMs: 7_000,
        }])
    })

    test("cruza dos y tres fragmentos sin repetir el solapado", () => {
        expect(plan([
            video(1, 0, 10_000),
            video(2, 10_000, 20_000),
        ], 8_000, 16_000)).toEqual([
            { videoId: 1, b2FilePath: "club_1/court_1/1.mp4", localStartMs: 8_000, durationMs: 2_000 },
            { videoId: 2, b2FilePath: "club_1/court_1/2.mp4", localStartMs: 0, durationMs: 6_000 },
        ])

        const overlapped = plan([
            video(1, 0, 20_000),
            video(2, 10_000, 25_000),
            video(3, 25_000, 40_000),
        ], 5_000, 28_000)
        expect(overlapped.map((segment) => [segment.videoId, segment.localStartMs, segment.durationMs])).toEqual([
            [1, 5_000, 15_000],
            [2, 10_000, 5_000],
            [3, 0, 3_000],
        ])
        expect(overlapped.reduce((total, segment) => total + segment.durationMs, 0)).toBe(23_000)
    })

    test("ordena fragmentos desordenados", () => {
        expect(plan([
            video(2, 10_000, 20_000),
            video(1, 0, 10_000),
        ], 0, 15_000).map((segment) => segment.videoId)).toEqual([1, 2])
    })

    test("tolera un hueco chico y rechaza uno mayor", () => {
        expect(plan([
            video(1, 0, 10_000),
            video(2, 11_000, 20_000),
        ], 0, 15_000, 1_000)).toEqual([
            { videoId: 1, b2FilePath: "club_1/court_1/1.mp4", localStartMs: 0, durationMs: 10_000 },
            { videoId: 2, b2FilePath: "club_1/court_1/2.mp4", localStartMs: 0, durationMs: 4_000 },
        ])

        expect(() => plan([
            video(1, 0, 10_000),
            video(2, 12_000, 20_000),
        ], 0, 15_000, 1_000)).toThrow(ClipSegmentError)
        try {
            plan([video(1, 0, 10_000), video(2, 12_000, 20_000)], 0, 15_000, 1_000)
        } catch (error) {
            expect(error).toMatchObject({ code: "CLIP_COVERAGE_GAP" })
        }
    })

    test("sin fragmentos responde que no hay video", () => {
        expect(() => plan([], 0, 5_000)).toThrow(expect.objectContaining({ code: "CLIP_NOT_FOUND" }))
        expect(() => plan([video(1, 0, 1_000)], 5_000, 8_000)).toThrow(expect.objectContaining({ code: "CLIP_NOT_FOUND" }))
    })

    test("incluye el inicio y el final exactos de un fragmento", () => {
        expect(plan([video(1, 0, 10_000)], 0, 10_000)).toEqual([{
            videoId: 1,
            b2FilePath: "club_1/court_1/1.mp4",
            localStartMs: 0,
            durationMs: 10_000,
        }])
        expect(plan([
            video(1, 0, 10_000),
            video(2, 10_000, 20_000),
        ], 10_000, 20_000)).toEqual([{
            videoId: 2,
            b2FilePath: "club_1/court_1/2.mp4",
            localStartMs: 0,
            durationMs: 10_000,
        }])
    })
})
