import { Request, Response } from "express"
import { pingDatabase } from "../config/db"
import { HeartbeatService } from "../services/HeartbeatService"
import { config } from "../config/config"
import fs from "fs"
import { statfs } from "fs/promises"

export const live = (_req: Request, res: Response) => {
    res.status(200).json({ status: "live" })
}

export const ready = async (_req: Request, res: Response) => {
    await pingDatabase()
    if (!config.isTest) {
        const workerOk = await HeartbeatService.isFresh("worker")
        if (!workerOk) {
            res.status(503).json({ status: "not_ready", reason: "worker" })
            return
        }
    }

    let diskOk = true
    try {
        if (typeof statfs === "function") {
            const stats = await statfs(config.VIDEO_DIR)
            const freeRatio = Number(stats.bfree) / Number(stats.blocks || 1)
            diskOk = freeRatio > 0.05
        } else {
            fs.accessSync(config.VIDEO_DIR, fs.constants.W_OK)
        }
    } catch {
        diskOk = false
    }

    if (!diskOk) {
        res.status(503).json({ status: "not_ready", reason: "disk" })
        return
    }
    res.status(200).json({ status: "ready" })
}

export const metrics = (_req: Request, res: Response) => {
    const memory = process.memoryUsage()
    res.type("text/plain").send([
        `process_uptime_seconds ${process.uptime()}`,
        `nodejs_heap_used_bytes ${memory.heapUsed}`,
        `nodejs_rss_bytes ${memory.rss}`,
    ].join("\n"))
}
