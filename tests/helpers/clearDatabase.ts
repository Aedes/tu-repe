import { pool } from "../../src/config/db"
import { config } from "../../src/config/config"

export const clearDatabase = async () => {
    if (config.NODE_ENV !== "test" || !config.MYSQL_DATABASE.endsWith("_test")) {
        throw new Error("clearDatabase solo puede ejecutarse contra una base *_test")
    }
    await pool.query("SET FOREIGN_KEY_CHECKS = 0")
    const tables = ["club_users", "videos", "video_ingestion_jobs", "video_deletion_jobs", "appointment_video_jobs", "failed_uploads", "courts", "clubs", "users", "worker_heartbeats"]
    for (const table of tables) {
        await pool.query(`DELETE FROM ${table}`)
    }
    await pool.query("SET FOREIGN_KEY_CHECKS = 1")
}
