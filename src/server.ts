import { app } from "./app"
import { config } from "./config/config"
import { assertRuntimeReady } from "./config/startup"
import { pool } from "./config/db"
import { logger } from "./logger"

const SHUTDOWN_MS = 15_000

const start = async () => {
    await assertRuntimeReady()
    const server = app.listen(config.PORT, "0.0.0.0", () => {
        logger.info({ port: config.PORT }, "api_listening")
    })

    const shutdown = (signal: string) => {
        logger.info({ signal }, "api_shutdown")
        server.close(async () => {
            await pool.end()
            process.exit(0)
        })
        setTimeout(() => process.exit(1), SHUTDOWN_MS).unref()
    }

    process.on("SIGTERM", () => shutdown("SIGTERM"))
    process.on("SIGINT", () => shutdown("SIGINT"))
}

start().catch((error) => {
    logger.error({ err: error }, "api_start_failed")
    process.exit(1)
})
