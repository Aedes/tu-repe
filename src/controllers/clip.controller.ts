import { Request, Response } from "express"
import { ClipConverterService } from "../services/ClipConverterService"
import { TurnstileService } from "../services/TurnstileService"
import { AppError } from "../errors/AppError"
import { logger } from "../logger"

export const convertToMp4 = async (req: Request, res: Response) => {
    if (!req.file) throw AppError.badRequest("Archivo no enviado")
    await TurnstileService.verify(String(req.body.turnstileToken || ""), req.ip)

    const webmPath = req.file.path
    let mp4Path = ""
    let cleaned = false
    const cleanup = () => {
        if (cleaned) return
        cleaned = true
        ClipConverterService.cleanup([webmPath, mp4Path])
    }

    req.on("close", () => {
        if (!res.writableEnded) cleanup()
    })

    try {
        mp4Path = await ClipConverterService.convertWebmToMp4(webmPath)
        res.download(mp4Path, "clip-tu-repe.mp4", (err) => {
            cleanup()
            if (err) logger.error({ err }, "clip_download_failed")
        })
        res.on("error", cleanup)
        res.on("finish", cleanup)
        res.on("close", cleanup)
    } catch (error) {
        cleanup()
        throw error
    }
}
