import { pool } from "../src/config/db"
import { clearDatabase } from "./helpers/clearDatabse"

beforeEach(async () => {
    await clearDatabase()
})

afterAll(async () => {
    await pool.end()
})