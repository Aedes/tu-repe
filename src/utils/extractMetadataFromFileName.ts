const FILENAME_RE = /^cancha(\d+)_(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})\.mp4$/

export const extractMetadataFromFileName = (fileName: string) => {
    const match = FILENAME_RE.exec(fileName)
    if (!match) return null

    const courtId = Number(match[1])
    const startTime = new Date(`${match[2]}T${match[3]}:${match[4]}:${match[5]}Z`)
    if (!Number.isFinite(courtId) || Number.isNaN(startTime.getTime())) {
        return null
    }

    return { courtId, startTime }
}
