import { exit } from "process";
import { pool } from "../config/db"

const clearDatabase = async () => {
    try {
        console.log("Clearing database...")

        await pool.query('SET FOREIGN_KEY_CHECKS = 0')
        await pool.query('DELETE FROM clubs');
        await pool.query('DELETE FROM courts');
        await pool.query('DELETE FROM videos');
        await pool.query('DELETE FROM failed_uploads');
        await pool.query('SET FOREIGN_KEY_CHECKS = 1')

        console.log("Database cleared.")

        exit(0);
    } catch (error) {
        console.error("Error clearing database:", error);
    }
}

clearDatabase();