import { Request, Response } from "express"
import { ClipConverterService } from "../services/ClipConverterService"
import { ClipExtractError, ClipExtractService } from "../services/ClipExtractService"
import { TurnstileService } from "../services/TurnstileService"
import { AppError } from "../errors/AppError"
import { logger } from "../logger"

const clipFailure = (error: ClipExtractError) => {
    switch (error.code) {
        case "INVALID_CLIP_RANGE":
            return AppError.badRequest("El rango del clip no es válido", error.code)
        case "CLIP_NOT_FOUND":
            return AppError.notFound("No hay video para ese momento", error.code)
        case "CLIP_COVERAGE_GAP":
            return new AppError(422, error.code, "Faltan fragmentos para generar ese clip")
        case "CLIP_QUEUE_FULL":
            return AppError.unavailable("Hay muchos clips en proceso. Probá de nuevo en un minuto", error.code)
        case "CLIP_DISK_FULL":
            return AppError.unavailable("No hay espacio suficiente para generar el clip", error.code)
        case "CLIP_PROCESSING_TIMEOUT":
            return new AppError(504, error.code, "La generación del clip tardó demasiado")
        default:
            return new AppError(500, "CLIP_PROCESSING_FAILED", "No se pudo generar el clip")
    }
}

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

export const extractClip = async (req: Request, res: Response) => {
    await TurnstileService.verify(String(req.body.turnstileToken || ""), req.ip)
    let result: Awaited<ReturnType<typeof ClipExtractService.extract>> | null = null
    let cleaned = false
    const cleanup = () => {
        if (cleaned) return
        cleaned = true
        void result?.cleanup().catch((error) => {
            logger.warn({ err: error instanceof Error ? error.name : "cleanup" }, "clip_extract_cleanup_failed")
        })
    }

    req.on("close", () => {
        if (!res.writableEnded) cleanup()
    })

    try {
        result = await ClipExtractService.extract({
            clubUrlId: req.body.clubUrlId,
            courtPublicId: req.body.courtId,
            appointmentStart: new Date(req.body.appointmentStartTime),
            offsetMs: req.body.offsetMs,
            durationMs: req.body.durationMs,
        })
        res.setHeader("Content-Type", "video/mp4")
        res.setHeader("Cache-Control", "no-store")
        res.download(result.outputPath, "clip-tu-repe.mp4", (error) => {
            cleanup()
            if (error) logger.error({ err: error instanceof Error ? error.name : "download" }, "clip_download_failed")
        })
        res.on("error", cleanup)
        res.on("finish", cleanup)
        res.on("close", cleanup)
    } catch (error) {
        cleanup()
        if (error instanceof ClipExtractError) throw clipFailure(error)
        throw error
    }
}
