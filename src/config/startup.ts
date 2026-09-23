import { execFile } from "child_process"
import { promisify } from "util"
import fs from "fs"
import { config } from "./config"
import { pingDatabase } from "./db"
import { logger } from "../logger"

const execFileAsync = promisify(execFile)

async function assertBinary(binary: string) {
    try {
        await execFileAsync(binary, ["-version"])
    } catch {
        throw new Error(`${binary} no está instalado o no es ejecutable`)
    }
}

export async function assertRuntimeReady() {
    if (process.env.TZ && process.env.TZ !== "UTC") {
        logger.warn({ tz: process.env.TZ }, "TZ distinto de UTC; el pipeline espera UTC")
    }

    await pingDatabase()

    for (const dir of [config.VIDEO_DIR, config.UPLOAD_DIR]) {
        fs.mkdirSync(dir, { recursive: true })
        fs.accessSync(dir, fs.constants.W_OK)
    }

    if (!config.isTest) {
        await assertBinary("ffmpeg")
        await assertBinary("ffprobe")
    }

    logger.info("Runtime listo")
}
