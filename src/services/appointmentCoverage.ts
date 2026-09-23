import { createHash } from "crypto"
import { IVideo } from "../types"

export type CoverageAssessment =
    | { kind: "not_found" }
    | { kind: "fallback"; videos: IVideo[] }
    | { kind: "complete"; videos: IVideo[] }

const time = (value: Date) => new Date(value).getTime()

// El MVP no recorta los fragmentos: exige que, en conjunto, cubran el turno.

export const assessAppointmentCoverage = (
    videos: IVideo[],
    appointmentStart: Date,
    appointmentEnd: Date,
    toleranceMs: number
): CoverageAssessment => {
    if (!videos.length) return { kind: "not_found" }

    const sorted = [...videos].sort((left, right) => time(left.startTime) - time(right.startTime))
    let cursor = time(appointmentStart)
    const end = time(appointmentEnd)
    const used: IVideo[] = []

    for (const video of sorted) {
        const start = time(video.startTime)
        const finish = time(video.endTime)
        if (finish <= cursor) continue
        if (start > cursor + toleranceMs) return { kind: "fallback", videos: sorted }
        used.push(video)
        cursor = Math.max(cursor, finish)
        if (cursor >= end - toleranceMs) return { kind: "complete", videos: used }
    }

    return { kind: "fallback", videos: sorted }
}

export const appointmentCacheKey = (courtId: number, start: Date, end: Date) => {
    const raw = `${courtId}|${new Date(start).toISOString()}|${new Date(end).toISOString()}`
    return createHash("sha256").update(raw).digest("hex")
}

export const earliestExpiry = (videos: IVideo[]): Date | null => {
    const times = videos
        .map((video) => video.expiresAt ? time(video.expiresAt) : Number.NaN)
        .filter((value) => Number.isFinite(value))
    if (!times.length) return null
    return new Date(Math.min(...times))
}
