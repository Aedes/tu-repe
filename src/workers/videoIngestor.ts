import chokidar from "chokidar"
import fs from "fs"
import { IngestionService } from "../services/IngestionService"
import { config } from "../config/config"
import { logger } from "../logger"

let watcher: ReturnType<typeof chokidar.watch> | undefined

const queueMp4 = (filePath: string) => {
    if (!filePath.endsWith(".mp4")) return
    void IngestionService.registerFile(filePath)
}

export const initVideoIngestor = () => {
    fs.mkdirSync(config.VIDEO_DIR, { recursive: true })
    watcher = chokidar.watch(config.VIDEO_DIR, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: config.STABILITY_THRESHOLD_MS,
            pollInterval: 1_000,
        },
        ignored: (filePath, stats) => Boolean(stats?.isFile() && !String(filePath).endsWith(".mp4")),
    })

    watcher.on("add", queueMp4)
    watcher.on("change", queueMp4)
    watcher.on("error", (error) => logger.error({ err: error }, "video_ingestor_error"))

    logger.info({ watchPath: config.VIDEO_DIR }, "video_ingestor_started")
}

export const stopVideoIngestor = () => {
    void watcher?.close()
}
