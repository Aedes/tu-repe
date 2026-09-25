import { BaseRepository } from "./BaseRepository"
import { IFailedUpload } from "../types"
import { pool } from "../config/db"

export class FailedUploadRepository extends BaseRepository<IFailedUpload> {
    protected tableName = "failed_uploads"
    protected primaryKey = "id"

    async findPendingAndRetrying(): Promise<IFailedUpload[]> {
        const [rows] = await pool.query(
            `SELECT * FROM ${this.tableName}
             WHERE status IN ('pending', 'retrying')
             ORDER BY created_at ASC`
        )
        return (rows as Record<string, unknown>[]).map((row) => this.mapColumnsToFields(row))
    }

    async findOldPermanentlyFailed(daysOld: number): Promise<IFailedUpload[]> {
        const [rows] = await pool.query(
            `SELECT * FROM ${this.tableName}
             WHERE status = 'failed_permanently'
             AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
             ORDER BY created_at ASC`,
            [daysOld]
        )
        return (rows as Record<string, unknown>[]).map((row) => this.mapColumnsToFields(row))
    }

    async incrementAttempts(id: number, errorMessage?: string): Promise<IFailedUpload | null> {
        const [result] = await pool.query(
            `UPDATE ${this.tableName}
             SET attempts_count = attempts_count + 1,
                 last_attempt_at = NOW(),
                 error_message = COALESCE(?, error_message),
                 status = 'retrying'
             WHERE ${this.primaryKey} = ?`,
            [errorMessage, id]
        )
        if ((result as { affectedRows: number }).affectedRows === 0) return null
        return this.findById(id)
    }

    async markAsPermanentlyFailed(id: number): Promise<IFailedUpload | null> {
        const [result] = await pool.query(
            `UPDATE ${this.tableName} SET status = 'failed_permanently' WHERE ${this.primaryKey} = ?`,
            [id]
        )
        if ((result as { affectedRows: number }).affectedRows === 0) return null
        return this.findById(id)
    }
}
