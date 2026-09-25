export type ClipSource = {
    id: number
    b2FilePath: string
    startTime: Date
    endTime: Date
}

export type PlannedClipSegment = {
    videoId: number
    b2FilePath: string
    localStartMs: number
    durationMs: number
}

export class ClipSegmentError extends Error {
    constructor(readonly code: "CLIP_NOT_FOUND" | "CLIP_COVERAGE_GAP") {
        super(code)
        this.name = "ClipSegmentError"
    }
}

const timeOf = (value: Date) => new Date(value).getTime()

export const planClipSegments = (
    videos: ClipSource[],
    clipStart: Date,
    clipEnd: Date,
    toleranceMs: number,
): PlannedClipSegment[] => {
    const end = timeOf(clipEnd)
    const sorted = [...videos].sort((left, right) => timeOf(left.startTime) - timeOf(right.startTime))
    let cursor = timeOf(clipStart)
    const segments: PlannedClipSegment[] = []

    for (const video of sorted) {
        const videoStart = timeOf(video.startTime)
        const videoEnd = timeOf(video.endTime)
        if (videoEnd <= cursor) continue
        if (videoStart > cursor + toleranceMs) {
            throw new ClipSegmentError("CLIP_COVERAGE_GAP")
        }
        const segmentStart = Math.max(cursor, videoStart)
        const segmentEnd = Math.min(end, videoEnd)
        if (segmentEnd > segmentStart) {
            segments.push({
                videoId: video.id,
                b2FilePath: video.b2FilePath,
                localStartMs: segmentStart - videoStart,
                durationMs: segmentEnd - segmentStart,
            })
            cursor = segmentEnd
        }
        if (cursor >= end - toleranceMs) break
    }

    if (!segments.length) throw new ClipSegmentError("CLIP_NOT_FOUND")
    if (cursor < end - toleranceMs) throw new ClipSegmentError("CLIP_COVERAGE_GAP")
    return segments
}
