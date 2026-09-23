import { pool } from "../config/db"
import { IDeletionJob } from "../types"
import { generatePublicId } from "../utils/publicId"

const mapJob = (row: Record<string, any>): IDeletionJob => ({
    id: row.id,
    publicId: row.public_id,
    videoId: row.video_id,
    courtId: row.court_id,
    clubId: row.club_id,
    b2FilePath: row.b2_file_path,
    status: row.status,
    attemptsCount: row.attempts_count,
    errorMessage: row.error_message,
    lockedAt: row.locked_at,
})

export class DeletionJobRepository {
    async enqueue(job: { videoId?: number | null; courtId?: number | null; clubId?: number | null; b2FilePath: string }) {
        await pool.query(
            `INSERT INTO video_deletion_jobs (public_id, video_id, court_id, club_id, b2_file_path, status, attempts_count)
             VALUES (?, ?, ?, ?, ?, 'pending', 0)
             ON DUPLICATE KEY UPDATE status = IF(status = 'completed', 'completed', status)`,
            [generatePublicId(), job.videoId || null, job.courtId || null, job.clubId || null, job.b2FilePath]
        )
    }

    async claimNext(): Promise<IDeletionJob | null> {
        const connection = await pool.getConnection()
        try {
            await connection.beginTransaction()
            const [rows] = await connection.query(
                `SELECT * FROM video_deletion_jobs
                 WHERE status IN ('pending', 'failed')
                   AND (locked_at IS NULL OR locked_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 MINUTE))
                 ORDER BY created_at ASC LIMIT 1 FOR UPDATE`
            )
            const job = (rows as Record<string, any>[])[0]
            if (!job) {
                await connection.commit()
                return null
            }
            await connection.query(
                `UPDATE video_deletion_jobs SET status = 'in_progress', locked_at = UTC_TIMESTAMP() WHERE id = ?`,
                [job.id]
            )
            await connection.commit()
            return mapJob({ ...job, status: "in_progress" })
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }

    async markCompleted(id: number) {
        await pool.query(`UPDATE video_deletion_jobs SET status = 'completed', locked_at = NULL WHERE id = ?`, [id])
    }

    async markFailed(id: number, errorMessage: string, attempts: number) {
        await pool.query(
            `UPDATE video_deletion_jobs SET status = 'failed', error_message = ?, attempts_count = ?, locked_at = NULL WHERE id = ?`,
            [errorMessage, attempts, id]
        )
    }

    async findPending(): Promise<IDeletionJob[]> {
        const [rows] = await pool.query(`SELECT * FROM video_deletion_jobs WHERE status <> 'completed'`)
        return (rows as Record<string, any>[]).map(mapJob)
    }
}
