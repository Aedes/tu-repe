import { Request, Response } from "express"
import { VideoService } from "../services/VideoService"
import { CourtService } from "../services/CourtService"
import { TurnstileService } from "../services/TurnstileService"
import { AppointmentVideoService } from "../services/AppointmentVideoService"
import { AppError } from "../errors/AppError"
import { verifyRenderContinuation } from "../utils/renderContinuation"

const toAdminVideo = (video: NonNullable<Awaited<ReturnType<typeof VideoService.findVideoByPublicId>>>) => ({
    id: video.publicId,
    fileName: video.fileName,
    startTime: video.startTime,
    endTime: video.endTime,
    status: video.status,
    expiresAt: video.expiresAt,
})

export const createVideo = async (req: Request, res: Response) => {
    const courtId = await CourtService.resolveCourtId(req.body.courtId)
    const video = await VideoService.createVideo({
        courtId,
        fileName: req.body.fileName,
        b2FilePath: req.body.b2FilePath,
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
    })
    res.status(201).json(toAdminVideo(video))
}

export const getAllVideos = async (_req: Request, res: Response) => {
    const videos = await VideoService.getAllVideos()
    res.status(200).json(videos.filter((video) => video.status !== "deleted").map(toAdminVideo))
}

export const getVideoById = async (req: Request, res: Response) => {
    const video = await VideoService.findVideoByPublicId(req.params.id)
    if (!video || video.status === "deleted") throw AppError.notFound("Video not found")
    res.status(200).json(toAdminVideo(video))
}

export const getVideosByCourtId = async (req: Request, res: Response) => {
    const courtId = await CourtService.resolveCourtId(req.params.courtId)
    const videos = await VideoService.getVideosByCourtId(courtId)
    res.status(200).json(videos.filter((video) => video.status !== "deleted").map(toAdminVideo))
}

export const getVideosByDateRange = async (req: Request, res: Response) => {
    const start = new Date(String(req.query.startTime))
    const end = new Date(String(req.query.endTime))
    const courtId = await CourtService.resolveCourtId(String(req.query.courtId))
    const videos = await VideoService.getVideosBetweenDatesAndCourtId(start, end, courtId)
    res.status(200).json(videos.map(toAdminVideo))
}

export const getVideoDownloadUrlsForAppointment = async (req: Request, res: Response) => {
    await TurnstileService.verify(String(req.query.turnstileToken), req.ip)
    const start = new Date(String(req.query.startTime))
    const courtId = await CourtService.resolveCourtId(String(req.query.courtId))
    const urls = await VideoService.getVideoDownloadUrlsForAppointment(start, courtId, String(req.query.clubUrlId))
    res.setHeader("Cache-Control", "no-store")
    res.setHeader("Referrer-Policy", "no-referrer")
    res.status(200).json(urls)
}

const sendRender = (res: Response, result: Awaited<ReturnType<typeof AppointmentVideoService.requestRender>>) => {
    res.setHeader("Cache-Control", "no-store")
    res.setHeader("Referrer-Policy", "no-referrer")
    const status = result.status === "queued" || result.status === "processing" ? 202 : 200
    res.status(status).json(result)
}

export const createAppointmentRender = async (req: Request, res: Response) => {
    const startTime = new Date(req.body.startTime)
    const continuesPreparation = req.body.mode === "unified" && typeof req.body.continuationToken === "string"
    if (continuesPreparation) {
        const valid = verifyRenderContinuation(req.body.continuationToken, {
            clubUrlId: String(req.body.clubUrlId),
            courtPublicId: String(req.body.courtId),
            startTime: startTime.toISOString(),
        })
        if (!valid) throw AppError.forbidden("La búsqueda expiró. Volvé a buscar el partido.")
    } else {
        await TurnstileService.verify(String(req.body.turnstileToken || ""), req.ip)
    }
    const result = await AppointmentVideoService.requestRender({
        startTime,
        courtPublicId: String(req.body.courtId),
        clubUrlId: String(req.body.clubUrlId),
        mode: req.body.mode,
    })
    sendRender(res, result)
}

export const getAppointmentRender = async (req: Request, res: Response) => {
    const result = await AppointmentVideoService.getRenderStatus(req.params.jobId)
    sendRender(res, result)
}

export const updateVideo = async (req: Request, res: Response) => {
    const updated = await VideoService.updateVideoByPublicId(req.params.id, {
        fileName: req.body.fileName,
        b2FilePath: req.body.b2FilePath,
        startTime: req.body.startTime ? new Date(req.body.startTime) : undefined,
        endTime: req.body.endTime ? new Date(req.body.endTime) : undefined,
    })
    if (!updated) throw AppError.notFound("Video not found")
    res.status(200).json(toAdminVideo(updated))
}

export const deleteVideo = async (req: Request, res: Response) => {
    const deleted = await VideoService.deleteVideoByPublicId(req.params.id)
    if (!deleted) throw AppError.notFound("Video not found")
    res.status(200).json({ message: "Video deleted successfully" })
}
