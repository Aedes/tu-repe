import { pool } from "../../../src/config/db"
import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { AppointmentVideoJobRepository } from "../../../src/repositories/AppointmentVideoJobRepository"
import { RetentionService } from "../../../src/services/RetentionService"
import { B2Service } from "../../../src/services/B2Service"

describe("retención de videos unidos", () => {
    test("borra el objeto derivado vencido", async () => {
        const club = await ClubService.createClub(new Club("Aedes", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle 1", "retclub001"))
        const court = await CourtService.createCourt(new Court(club.id!, "Cancha", "10.0.0.4", "/stream", "key"))
        const repo = new AppointmentVideoJobRepository()
        const start = new Date("2026-01-01T18:00:00.000Z")
        const job = await repo.enqueueOrGet({
            courtId: court.id!,
            clubId: club.id!,
            appointmentStart: start,
            appointmentEnd: new Date(start.getTime() + 60 * 60 * 1000),
            cacheKey: "e".repeat(64),
            sourceVideoIds: [],
            sourceCount: 0,
            expiresAt: new Date(Date.now() - 60_000),
        })
        await pool.query(
            `UPDATE appointment_video_jobs SET status = 'completed', b2_file_path = ? WHERE id = ?`,
            [`club_${club.id}/court_${court.id}/appointments/merged.mp4`, job.id]
        )
        jest.spyOn(B2Service, "objectExists").mockResolvedValue(true)
        jest.spyOn(B2Service, "deleteObject").mockResolvedValue()
        const queued = await RetentionService.enqueueExpired()
        expect(queued).toBeGreaterThan(0)
        const processed = await RetentionService.processNext()
        expect(processed).toBe(true)
        expect(B2Service.deleteObject).toHaveBeenCalledWith(`club_${club.id}/court_${court.id}/appointments/merged.mp4`)
        const stored = await repo.findByPublicId(job.publicId!)
        expect(stored?.status).toBe("deleted")
        jest.restoreAllMocks()
    })
})
