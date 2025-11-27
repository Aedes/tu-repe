import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import { DATABASE_URL } from "../src/config/config";

const arg = process.env.NODE_ENV === "test" ? "test" : "development";

async function migrate() {
    const db = await mysql.createConnection(DATABASE_URL);

    await db.execute(`
    CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        run_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

    const migrationsDir = path.join("database", "migrations");

    console.log(migrationsDir)

    const files = fs
        .readdirSync(migrationsDir)
        .filter(f => f.endsWith(".sql"))
        .sort();

    for (const file of files) {
        const [rows] = await db.execute("SELECT 1 FROM migrations WHERE name = ?", [
            file,
        ]);
        if ((rows as any[]).length > 0) continue;

        const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");

        console.log(`Ejecutando migración: ${file}`);
        await db.query(sql);

        await db.execute("INSERT INTO migrations (name) VALUES (?)", [file]);
    }

    console.log("Migraciones completadas para", arg);
    await db.end();
}

migrate();
