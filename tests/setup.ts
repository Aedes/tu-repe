import { pool } from "../src/config/db"
import { clearDatabase } from "./helpers/clearDatabase"
import fs from "fs"

beforeEach(async () => {
    await clearDatabase()
})

afterAll(async () => {
    await pool.end()
    const base = "/var/videos"
    if (fs.existsSync(base)) {
        for (const entry of fs.readdirSync(base)) {
            const entryPath = `${base}/${entry}`;
            fs.rmSync(entryPath, { recursive: true, force: true });
        }
    }
})