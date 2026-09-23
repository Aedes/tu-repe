import fs from "fs"
import path from "path"
import mysql from "mysql2/promise"
import { config } from "../src/config/config"

async function preflight(db: mysql.Connection) {
    const checks: Array<{ name: string; sql: string }> = [
        {
            name: "videos.b2_file_path duplicados",
            sql: `SELECT b2_file_path, COUNT(*) c FROM videos GROUP BY b2_file_path HAVING c > 1`,
        },
        {
            name: "videos (court_id,file_name) duplicados",
            sql: `SELECT court_id, file_name, COUNT(*) c FROM videos GROUP BY court_id, file_name HAVING c > 1`,
        },
        {
            name: "clubs.public_id duplicados",
            sql: `SELECT public_id, COUNT(*) c FROM clubs GROUP BY public_id HAVING c > 1`,
        },
        {
            name: "courts.public_id duplicados",
            sql: `SELECT public_id, COUNT(*) c FROM courts GROUP BY public_id HAVING c > 1`,
        },
        {
            name: "videos.public_id duplicados",
            sql: `SELECT public_id, COUNT(*) c FROM videos GROUP BY public_id HAVING c > 1`,
        },
        {
            name: "users.public_id duplicados",
            sql: `SELECT public_id, COUNT(*) c FROM users GROUP BY public_id HAVING c > 1`,
        },
        {
            name: "clubs.url_id duplicados",
            sql: `SELECT url_id, COUNT(*) c FROM clubs GROUP BY url_id HAVING c > 1`,
        },
        {
            name: "failed_uploads.club_id huérfanos",
            sql: `SELECT fu.id FROM failed_uploads fu LEFT JOIN clubs c ON c.id = fu.club_id WHERE c.id IS NULL`,
        },
        {
            name: "failed_uploads.court_id huérfanos",
            sql: `SELECT fu.id FROM failed_uploads fu LEFT JOIN courts c ON c.id = fu.court_id WHERE c.id IS NULL`,
        },
    ]

    const issues: string[] = []
    for (const check of checks) {
        try {
            const [rows] = await db.query(check.sql)
            if ((rows as unknown[]).length) {
                issues.push(`${check.name}: ${(rows as unknown[]).length} filas. Resolver manualmente antes de reintentar.`)
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            if (!message.includes("doesn't exist")) {
                issues.push(`${check.name}: ${message}`)
            }
        }
    }
    if (issues.length) {
        throw new Error(`Preflight de integridad falló:\n- ${issues.join("\n- ")}`)
    }
}

async function migrate() {
    const db = await mysql.createConnection({
        host: config.MYSQL_HOST,
        port: config.MYSQL_PORT,
        user: config.MYSQL_USER,
        password: config.MYSQL_PASSWORD,
        database: config.MYSQL_DATABASE,
        multipleStatements: true,
        timezone: "Z",
    })

    const [lockRows] = await db.query("SELECT GET_LOCK('tu_repe_migrations', 60) AS got")
    const got = (lockRows as { got: number }[])[0]?.got
    if (got !== 1) {
        throw new Error("No se pudo obtener el lock de migraciones")
    }

    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS migrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                run_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `)

        await preflight(db)

        const migrationsDir = path.join("database", "migrations")
        const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort()

        for (const file of files) {
            const [rows] = await db.execute("SELECT 1 FROM migrations WHERE name = ?", [file])
            if ((rows as unknown[]).length > 0) continue

            const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8")
            console.log(`Ejecutando migración: ${file}`)
            await db.query(sql)
            await db.execute("INSERT INTO migrations (name) VALUES (?)", [file])
        }

        console.log("Migraciones completadas para", config.NODE_ENV)
    } finally {
        await db.query("SELECT RELEASE_LOCK('tu_repe_migrations')")
        await db.end()
    }
}

migrate().catch((error) => {
    console.error(error)
    process.exit(1)
})
