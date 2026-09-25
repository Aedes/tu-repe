import { pool } from "../config/db"
import { IIngestionJob, IngestionStatus } from "../types"
import { generatePublicId } from "../utils/publicId"
import { PoolConnection } from "mysql2/promise"

const mapJob = (row: Record<string, any>): IIngestionJob => ({
    id: row.id,
    publicId: row.public_id,
    filePath: row.file_path,
    fileName: row.file_name,
    clubId: row.club_id,
    courtId: row.court_id,
    startTime: row.start_time,
    endTime: row.end_time,
    b2FilePath: row.b2_file_path,
    status: row.status,
    attemptsCount: row.attempts_count,
    errorMessage: row.error_message,
    lockedAt: row.locked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
})

export class IngestionJobRepository {
    async upsertPending(job: Omit<IIngestionJob, "id" | "publicId" | "status" | "attemptsCount">): Promise<IIngestionJob> {
        await pool.query(
            `INSERT INTO video_ingestion_jobs
             (public_id, file_path, file_name, club_id, court_id, start_time, end_time, status, attempts_count)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0)
             ON DUPLICATE KEY UPDATE
               start_time = VALUES(start_time),
               end_time = VALUES(end_time),
               attempts_count = IF(status = 'failed_permanently', 0, attempts_count),
               error_message = IF(status = 'failed_permanently', NULL, error_message),
               locked_at = IF(status = 'failed_permanently', NULL, locked_at),
               status = IF(status = 'completed', status, IF(status = 'failed_permanently', 'pending', status))`,
            [generatePublicId(), job.filePath, job.fileName, job.clubId, job.courtId, job.startTime, job.endTime]
        )
        const [rows] = await pool.query(`SELECT * FROM video_ingestion_jobs WHERE file_path = ?`, [job.filePath])
        return mapJob((rows as Record<string, any>[])[0])
    }

    async claimNext(): Promise<IIngestionJob | null> {
        const connection = await pool.getConnection()
        try {
            await connection.beginTransaction()
            const [rows] = await connection.query(
                `SELECT * FROM video_ingestion_jobs
                 WHERE status IN ('pending', 'retrying', 'uploaded')
                   AND (locked_at IS NULL OR locked_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 MINUTE))
                 ORDER BY created_at ASC
                 LIMIT 1
                 FOR UPDATE`
            )
            const jobRow = (rows as Record<string, any>[])[0]
            if (!jobRow) {
                await connection.commit()
                return null
            }
            await connection.query(
                `UPDATE video_ingestion_jobs SET locked_at = UTC_TIMESTAMP(), status = IF(status = 'uploaded', 'uploaded', 'uploading') WHERE id = ?`,
                [jobRow.id]
            )
            await connection.commit()
            return mapJob({ ...jobRow, locked_at: new Date(), status: jobRow.status === "uploaded" ? "uploaded" : "uploading" })
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }

    async update(id: number, data: Partial<IIngestionJob>, connection?: PoolConnection) {
        const db = connection || pool
        const fields: string[] = []
        const values: unknown[] = []
        if (data.status) {
            fields.push("status = ?")
            values.push(data.status)
        }
        if (data.b2FilePath !== undefined) {
            fields.push("b2_file_path = ?")
            values.push(data.b2FilePath)
        }
        if (data.errorMessage !== undefined) {
            fields.push("error_message = ?")
            values.push(data.errorMessage)
        }
        if (data.attemptsCount !== undefined) {
            fields.push("attempts_count = ?")
            values.push(data.attemptsCount)
        }
        if (data.lockedAt === null) {
            fields.push("locked_at = NULL")
        }
        if (!fields.length) return
        values.push(id)
        await db.query(`UPDATE video_ingestion_jobs SET ${fields.join(", ")} WHERE id = ?`, values)
    }

    async markRetry(id: number, errorMessage: string, attempts: number, permanent: boolean) {
        const status: IngestionStatus = permanent ? "failed_permanently" : "retrying"
        await pool.query(
            `UPDATE video_ingestion_jobs
             SET status = ?, error_message = ?, attempts_count = ?, locked_at = NULL
             WHERE id = ?`,
            [status, errorMessage, attempts, id]
        )
    }

    async findByFilePath(filePath: string): Promise<IIngestionJob | null> {
        const [rows] = await pool.query(`SELECT * FROM video_ingestion_jobs WHERE file_path = ?`, [filePath])
        const result = rows as Record<string, any>[]
        return result[0] ? mapJob(result[0]) : null
    }

    async findIncomplete(): Promise<IIngestionJob[]> {
        const [rows] = await pool.query(
            `SELECT * FROM video_ingestion_jobs WHERE status NOT IN ('completed', 'failed_permanently')`
        )
        return (rows as Record<string, any>[]).map(mapJob)
    }

    async findFailedPermanent(): Promise<IIngestionJob[]> {
        const [rows] = await pool.query(`SELECT * FROM video_ingestion_jobs WHERE status = 'failed_permanently'`)
        return (rows as Record<string, any>[]).map(mapJob)
    }
}
