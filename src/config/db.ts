import mysql from "mysql2/promise"
import { config } from "./config"

export const pool = mysql.createPool({
    host: config.MYSQL_HOST,
    port: config.MYSQL_PORT,
    user: config.MYSQL_USER,
    password: config.MYSQL_PASSWORD,
    database: config.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    timezone: "Z",
    dateStrings: false,
})

export async function pingDatabase(): Promise<void> {
    const connection = await pool.getConnection()
    try {
        await connection.query("SELECT 1")
    } finally {
        connection.release()
    }
}
