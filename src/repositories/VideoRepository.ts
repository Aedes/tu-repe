import { BaseRepository } from "./BaseRepository"
import { IVideo } from "../types"
import { pool } from "../config/db"
import { PoolConnection } from "mysql2/promise"

export class VideoRepository extends BaseRepository<IVideo> {
    protected tableName = "videos"
    protected primaryKey = "id"

    async findByCourtId(courtId: number): Promise<IVideo[]> {
        return this.findBy({ courtId } as Partial<IVideo>)
    }

    async findAvailableOverlapping(courtId: number, startTime: Date, endTime: Date): Promise<IVideo[]> {
        const [rows] = await pool.query(
            `SELECT * FROM ${this.tableName}
             WHERE court_id = ?
               AND status = 'available'
               AND expires_at > UTC_TIMESTAMP()
               AND start_time < ?
               AND end_time > ?
             ORDER BY start_time ASC`,
            [courtId, endTime, startTime]
        )
        return (rows as Record<string, unknown>[]).map((row) => this.mapColumnsToFields(row))
    }

    async findOverlappingVideos(courtId: number, startTime: Date, endTime: Date, excludeId?: number, connection?: PoolConnection): Promise<IVideo[]> {
        const TOLERANCE_SECONDS = 10
        const startTimeWithTolerance = new Date(startTime.getTime() + TOLERANCE_SECONDS * 1000)
        const endTimeWithTolerance = new Date(endTime.getTime() - TOLERANCE_SECONDS * 1000)
        const params: unknown[] = [courtId, startTimeWithTolerance, endTimeWithTolerance]
        let sql = `SELECT * FROM ${this.tableName}
                WHERE court_id = ?
                AND status <> 'deleted'
                AND NOT (end_time <= ? OR start_time >= ?)`
        if (excludeId) {
            sql += " AND id <> ?"
            params.push(excludeId)
        }
        const db = connection || pool
        const [rows] = await db.query(sql, params)
        return (rows as Record<string, unknown>[]).map((row) => this.mapColumnsToFields(row))
    }

    async findByFileNameOrB2FilePath(fileName: string, filePath: string, connection?: PoolConnection): Promise<IVideo | null> {
        const db = connection || pool
        const [rows] = await db.query(
            `SELECT * FROM ${this.tableName} WHERE file_name = ? OR b2_file_path = ? LIMIT 1`,
            [fileName, filePath]
        )
        const result = rows as Record<string, unknown>[]
        return result.length ? this.mapColumnsToFields(result[0]) : null
    }

    async findExpiredAvailable(): Promise<IVideo[]> {
        const [rows] = await pool.query(
            `SELECT * FROM ${this.tableName}
             WHERE status = 'available' AND expires_at <= UTC_TIMESTAMP()`
        )
        return (rows as Record<string, unknown>[]).map((row) => this.mapColumnsToFields(row))
    }

    async markDeleting(id: number, connection?: PoolConnection) {
        const db = connection || pool
        await db.query(`UPDATE ${this.tableName} SET status = 'deleting' WHERE id = ? AND status = 'available'`, [id])
    }

    async markDeleted(id: number, connection?: PoolConnection) {
        const db = connection || pool
        await db.query(`UPDATE ${this.tableName} SET status = 'deleted', b2_file_path = CONCAT('deleted/', b2_file_path) WHERE id = ?`, [id])
    }
}
