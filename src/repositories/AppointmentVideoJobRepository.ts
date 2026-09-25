import { pool } from "../config/db"
import { config } from "../config/config"
import { IAppointmentVideoJob, AppointmentProcessingStep, AppointmentVideoStatus } from "../types"
import { generatePublicId } from "../utils/publicId"

const parseIds = (value: unknown): number[] => {
    if (Array.isArray(value)) return value.map(Number)
    if (typeof value === "string" && value) return JSON.parse(value) as number[]
    return []
}

const mapJob = (row: Record<string, any>): IAppointmentVideoJob => ({
    id: row.id,
    publicId: row.public_id,
    courtId: row.court_id,
    clubId: row.club_id,
    appointmentStart: new Date(row.appointment_start),
    appointmentEnd: new Date(row.appointment_end),
    cacheKey: row.cache_key,
    sourceVideoIds: parseIds(row.source_video_ids),
    sourceCount: row.source_count,
    b2FilePath: row.b2_file_path,
    status: row.status,
    processingStep: row.processing_step,
    attemptsCount: row.attempts_count,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    lockedAt: row.locked_at ? new Date(row.locked_at) : null,
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
})

export class AppointmentVideoJobRepository {
    async findByCacheKey(cacheKey: string): Promise<IAppointmentVideoJob | null> {
        const [rows] = await pool.query(`SELECT * FROM appointment_video_jobs WHERE cache_key = ?`, [cacheKey])
        const row = (rows as Record<string, any>[])[0]
        return row ? mapJob(row) : null
    }

    async findByPublicId(publicId: string): Promise<IAppointmentVideoJob | null> {
        const [rows] = await pool.query(`SELECT * FROM appointment_video_jobs WHERE public_id = ?`, [publicId])
        const row = (rows as Record<string, any>[])[0]
        return row ? mapJob(row) : null
    }

    async findByIds(ids: number[]): Promise<IAppointmentVideoJob[]> {
        if (!ids.length) return []
        const [rows] = await pool.query(
            `SELECT * FROM appointment_video_jobs WHERE id IN (${ids.map(() => "?").join(",")})`,
            ids
        )
        return (rows as Record<string, any>[]).map(mapJob)
    }

    async enqueueOrGet(job: Omit<IAppointmentVideoJob, "id" | "publicId" | "status" | "attemptsCount">): Promise<IAppointmentVideoJob> {
        await pool.query(
            `INSERT INTO appointment_video_jobs
             (public_id, court_id, club_id, appointment_start, appointment_end, cache_key,
              source_video_ids, source_count, status, attempts_count, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)
             ON DUPLICATE KEY UPDATE
               source_video_ids = IF(status = 'deleted', VALUES(source_video_ids), source_video_ids),
               source_count = IF(status = 'deleted', VALUES(source_count), source_count),
               expires_at = IF(status = 'deleted', VALUES(expires_at), expires_at),
               b2_file_path = IF(status = 'deleted', NULL, b2_file_path),
               attempts_count = IF(status = 'deleted', 0, attempts_count),
               error_code = IF(status = 'deleted', NULL, error_code),
               error_message = IF(status = 'deleted', NULL, error_message),
               processing_step = IF(status = 'deleted', NULL, processing_step),
               locked_at = IF(status = 'deleted', NULL, locked_at),
               status = IF(status = 'deleted', 'pending', status)`,
            [
                generatePublicId(),
                job.courtId,
                job.clubId,
                job.appointmentStart,
                job.appointmentEnd,
                job.cacheKey,
                JSON.stringify(job.sourceVideoIds),
                job.sourceCount,
                job.expiresAt || null,
            ]
        )
        const stored = await this.findByCacheKey(job.cacheKey)
        if (!stored) throw new Error("No se pudo crear el trabajo de unión")
        return stored
    }

    async claimNext(): Promise<IAppointmentVideoJob | null> {
        const connection = await pool.getConnection()
        try {
            await connection.beginTransaction()
            const [rows] = await connection.query(
                `SELECT * FROM appointment_video_jobs
                 WHERE status IN ('pending', 'retrying', 'processing')
                   AND (locked_at IS NULL OR locked_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? MINUTE))
                 ORDER BY created_at ASC, id ASC
                 LIMIT 1
                 FOR UPDATE`,
                [config.APPOINTMENT_MERGE_LOCK_TIMEOUT_MINUTES]
            )
            const row = (rows as Record<string, any>[])[0]
            if (!row) {
                await connection.commit()
                return null
            }
            await connection.query(
                `UPDATE appointment_video_jobs
                 SET status = 'processing', locked_at = UTC_TIMESTAMP(), processing_step = NULL
                 WHERE id = ?`,
                [row.id]
            )
            await connection.commit()
            return mapJob({ ...row, status: "processing", locked_at: new Date(), processing_step: null })
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }

    async markStep(id: number, step: AppointmentProcessingStep) {
        await pool.query(
            `UPDATE appointment_video_jobs SET processing_step = ?, status = 'processing' WHERE id = ?`,
            [step, id]
        )
    }

    async markCompleted(id: number, b2FilePath: string, expiresAt: Date | null) {
        await pool.query(
            `UPDATE appointment_video_jobs
             SET status = 'completed', b2_file_path = ?, expires_at = ?, processing_step = NULL,
                 locked_at = NULL, error_code = NULL, error_message = NULL
             WHERE id = ?`,
            [b2FilePath, expiresAt, id]
        )
    }

    async markRetry(id: number, errorCode: string, errorMessage: string, attempts: number, permanent: boolean) {
        const status: AppointmentVideoStatus = permanent ? "failed_permanently" : "retrying"
        await pool.query(
            `UPDATE appointment_video_jobs
             SET status = ?, error_code = ?, error_message = ?, attempts_count = ?, locked_at = NULL, processing_step = NULL
             WHERE id = ?`,
            [status, errorCode, errorMessage.slice(0, 2000), attempts, id]
        )
    }

    async releaseLock(id: number) {
        await pool.query(
            `UPDATE appointment_video_jobs
             SET status = IF(attempts_count = 0, 'pending', 'retrying'), locked_at = NULL, processing_step = NULL
             WHERE id = ? AND status = 'processing'`,
            [id]
        )
    }

    async markPending(id: number) {
        await pool.query(
            `UPDATE appointment_video_jobs
             SET status = 'pending', b2_file_path = NULL, locked_at = NULL, processing_step = NULL,
                 attempts_count = 0, error_code = NULL, error_message = NULL
             WHERE id = ?`,
            [id]
        )
    }

    async findExpiredCompleted(): Promise<IAppointmentVideoJob[]> {
        const [rows] = await pool.query(
            `SELECT * FROM appointment_video_jobs
             WHERE status = 'completed' AND expires_at IS NOT NULL AND expires_at <= UTC_TIMESTAMP()`
        )
        return (rows as Record<string, any>[]).map(mapJob)
    }

    async findStoredByCourt(courtId: number): Promise<IAppointmentVideoJob[]> {
        const [rows] = await pool.query(
            `SELECT * FROM appointment_video_jobs
             WHERE court_id = ? AND b2_file_path IS NOT NULL AND status NOT IN ('deleted', 'deleting')`,
            [courtId]
        )
        return (rows as Record<string, any>[]).map(mapJob)
    }

    async findStoredByClub(clubId: number): Promise<IAppointmentVideoJob[]> {
        const [rows] = await pool.query(
            `SELECT * FROM appointment_video_jobs
             WHERE club_id = ? AND b2_file_path IS NOT NULL AND status NOT IN ('deleted', 'deleting')`,
            [clubId]
        )
        return (rows as Record<string, any>[]).map(mapJob)
    }

    async markDeleting(id: number) {
        await pool.query(
            `UPDATE appointment_video_jobs SET status = 'deleting', locked_at = NULL WHERE id = ? AND status = 'completed'`,
            [id]
        )
    }

    async markDeleted(id: number) {
        await pool.query(`UPDATE appointment_video_jobs SET status = 'deleted', locked_at = NULL WHERE id = ?`, [id])
    }
}
