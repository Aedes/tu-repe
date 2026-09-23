import { exit } from "process";
import { pool } from "../config/db"
import { config } from "../config/config"

const clearDatabase = async () => {
    try {
        if (config.NODE_ENV !== "test" || !config.MYSQL_DATABASE.endsWith("_test")) {
            throw new Error("clearDatabase solo puede ejecutarse contra una base *_test")
        }
        console.log("Clearing database...")

        await pool.query('SET FOREIGN_KEY_CHECKS = 0')
        await pool.query('DELETE FROM clubs');
        await pool.query('DELETE FROM courts');
        await pool.query('DELETE FROM videos');
        await pool.query('DELETE FROM users')
        await pool.query('DELETE FROM club_users')
        await pool.query('DELETE FROM failed_uploads');
        await pool.query('DELETE FROM video_ingestion_jobs');
        await pool.query('DELETE FROM video_deletion_jobs');
        await pool.query('DELETE FROM worker_heartbeats');
        await pool.query('SET FOREIGN_KEY_CHECKS = 1')

        console.log("Database cleared.")

        exit(0);
    } catch (error) {
        console.error("Error clearing database:", error);
    }
}

clearDatabase();