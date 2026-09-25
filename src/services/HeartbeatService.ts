import { pool } from "../config/db"

export class HeartbeatService {
    static async beat(workerName: string, meta: Record<string, unknown> = {}) {
        await pool.query(
            `INSERT INTO worker_heartbeats (worker_name, last_seen, meta)
             VALUES (?, UTC_TIMESTAMP(), ?)
             ON DUPLICATE KEY UPDATE last_seen = UTC_TIMESTAMP(), meta = VALUES(meta)`,
            [workerName, JSON.stringify(meta)]
        )
    }

    static async isFresh(workerName: string, maxAgeSeconds = 120): Promise<boolean> {
        const [rows] = await pool.query(
            `SELECT last_seen FROM worker_heartbeats
             WHERE worker_name = ?
               AND last_seen > DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? SECOND)
             LIMIT 1`,
            [workerName, maxAgeSeconds]
        )
        return (rows as unknown[]).length > 0
    }
}
