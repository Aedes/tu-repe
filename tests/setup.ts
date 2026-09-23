import { pool } from "../src/config/db"
import { clearDatabase } from "./helpers/clearDatabase"
import { config } from "../src/config/config"
import fs from "fs"

beforeEach(async () => {
    await clearDatabase()
})

afterAll(async () => {
    await clearDatabase()
    await pool.end()
    const base = config.VIDEO_DIR
    if (fs.existsSync(base)) {
        for (const entry of fs.readdirSync(base)) {
            const entryPath = `${base}/${entry}`;
            fs.rmSync(entryPath, { recursive: true, force: true });
        }
    }
})