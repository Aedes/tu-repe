import { RetentionService } from "../src/services/RetentionService"
import { pool } from "../src/config/db"

async function main() {
    const result = await RetentionService.dryRun()
    console.log(JSON.stringify(result, null, 2))
    await pool.end()
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
