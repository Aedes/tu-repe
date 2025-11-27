import fs from "fs"
import path from "path"

export const createCourtDirectories = (clubId: number, courtId: number) => {
    const base = "/var/videos"
    const clubPath = path.join(base, `club_${clubId}`)
    const courtPath = path.join(clubPath, `court_${courtId}`)

    if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true })
    if (!fs.existsSync(clubPath)) fs.mkdirSync(clubPath, { recursive: true })
    if (!fs.existsSync(courtPath)) fs.mkdirSync(courtPath, { recursive: true })
}