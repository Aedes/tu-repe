import { pool } from "../../src/config/db"

export const clearDatabase = async () => {
    await pool.query('SET FOREIGN_KEY_CHECKS = 0')
    await pool.query('DELETE FROM clubs');
    await pool.query('DELETE FROM courts');
    await pool.query('DELETE FROM videos');
    await pool.query('SET FOREIGN_KEY_CHECKS = 1')
}