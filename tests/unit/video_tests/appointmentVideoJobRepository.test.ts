import { pool } from "../../../src/config/db"
import { AppointmentVideoJobRepository } from "../../../src/repositories/AppointmentVideoJobRepository"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"

const repo = new AppointmentVideoJobRepository()

const seed = async () => {
    const club = await ClubService.createClub(new Club("Club Merge", "08:00", "22:00", 90, "Argentina", "Mendoza", "San Rafael", "Calle 1", "mergeclub1"))
    const court = await CourtService.createCourt(new Court(club.id!, "Cancha", "10.0.0.1", "/stream", "key"))
    return { club, court }
}

const payload = (courtId: number, clubId: number, key: string, start = new Date("2026-01-01T18:00:00.000Z")) => ({
    courtId,
    clubId,
    appointmentStart: start,
    appointmentEnd: new Date(start.getTime() + 90 * 60 * 1000),
    cacheKey: key,
    sourceVideoIds: [1, 2, 3],
    sourceCount: 3,
    expiresAt: new Date(start.getTime() + 96 * 60 * 60 * 1000),
})

describe("AppointmentVideoJobRepository", () => {
    test("dos altas simultáneas crean un solo trabajo", async () => {
        const { club, court } = await seed()
        const key = "a".repeat(64)
        const [first, second] = await Promise.all([
            repo.enqueueOrGet(payload(court.id!, club.id!, key)),
            repo.enqueueOrGet(payload(court.id!, club.id!, key)),
        ])
        expect(first.publicId).toBe(second.publicId)
        const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM appointment_video_jobs WHERE cache_key = ?`, [key])
        expect(Number((rows as { total: number }[])[0].total)).toBe(1)
    })

    test("reclama en orden y recupera un lock vencido", async () => {
        const { club, court } = await seed()
        const older = await repo.enqueueOrGet(payload(court.id!, club.id!, "b".repeat(64), new Date("2026-01-01T10:00:00.000Z")))
        const newer = await repo.enqueueOrGet(payload(court.id!, club.id!, "c".repeat(64), new Date("2026-01-01T12:00:00.000Z")))
        await pool.query(`UPDATE appointment_video_jobs SET created_at = '2026-01-01 10:00:00' WHERE id = ?`, [older.id])
        await pool.query(`UPDATE appointment_video_jobs SET created_at = '2026-01-01 10:05:00' WHERE id = ?`, [newer.id])
        const claimed = await repo.claimNext()
        expect(claimed?.publicId).toBe(older.publicId)
        expect(claimed?.status).toBe("processing")

        await pool.query(`UPDATE appointment_video_jobs SET status = 'processing', locked_at = '2020-01-01 00:00:00' WHERE id = ?`, [older.id])
        const reclaimed = await repo.claimNext()
        expect(reclaimed?.id).toBe(older.id)
    })

    test("el tercer fallo queda permanente y el reintento no", async () => {
        const { club, court } = await seed()
        const job = await repo.enqueueOrGet(payload(court.id!, club.id!, "d".repeat(64)))
        await repo.markRetry(job.id!, "TIMEOUT", "timeout", 1, false)
        const retrying = await repo.findByPublicId(job.publicId!)
        expect(retrying?.status).toBe("retrying")
        await repo.markRetry(job.id!, "TIMEOUT", "timeout", 3, true)
        const failed = await repo.findByPublicId(job.publicId!)
        expect(failed?.status).toBe("failed_permanently")
        expect(failed?.errorMessage).not.toMatch(/ffmpeg|\/var\/videos/i)
    })
})
