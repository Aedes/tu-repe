import { Request, Response } from "express"
import { CourtService } from "../services/CourtService"
import { ClubService } from "../services/ClubService"
import { toAdminCourt, toPublicCourt } from "../dto/responseDtos"
import { AppError } from "../errors/AppError"
import { config } from "../config/config"
import { timingSafeEqual } from "crypto"
import { logger } from "../logger"

const safeEqual = (a: string, b: string) => {
    const left = Buffer.from(a)
    const right = Buffer.from(b)
    if (left.length !== right.length) return false
    return timingSafeEqual(left, right)
}

export const createCourt = async (req: Request, res: Response) => {
    const clubId = await ClubService.resolveClubId(req.body.clubId)
    const existingCourts = await CourtService.getCourtsByClubId(clubId)
    const streamKey = CourtService.generateStreamKey(String(existingCourts.length + 1))
    const cameraPath = `club_${clubId}/${streamKey}`
    const newCourt = await CourtService.createCourt({
        clubId,
        name: req.body.name,
        cameraHost: req.body.cameraHost,
        cameraPath,
        streamKey,
    })
    res.status(201).json(toAdminCourt(newCourt, true))
}

export const getAllCourts = async (_req: Request, res: Response) => {
    const courts = await CourtService.getAllCourts()
    res.status(200).json(courts.map((court) => toAdminCourt(court)))
}

export const getCourtById = async (req: Request, res: Response) => {
    const court = await CourtService.findCourtByPublicId(req.params.id)
    if (!court) throw AppError.notFound("Court not found")
    res.status(200).json(toAdminCourt(court))
}

export const getCourtsByClubId = async (req: Request, res: Response) => {
    const courts = await CourtService.getCourtsByClubPublicId(req.params.id)
    res.status(200).json(courts.map((court) => toAdminCourt(court)))
}

export const getCourtsByClubUrlId = async (req: Request, res: Response) => {
    const club = await ClubService.findClubByUrlId(req.params.urlId)
    if (!club) throw AppError.notFound("Club not found")
    const courts = await CourtService.getCourtsByClubPublicId(club.publicId!)
    res.status(200).json(courts.map(toPublicCourt))
}

export const updateCourtAdmin = async (req: Request, res: Response) => {
    const updated = await CourtService.updateCourtByPublicId(req.params.id, req.body)
    if (!updated) throw AppError.notFound("Court not found")
    res.status(200).json(toAdminCourt(updated))
}

export const updateCourtUser = async (req: Request, res: Response) => {
    const updated = await CourtService.updateCourtByPublicId(req.params.id, { name: req.body.name })
    if (!updated) throw AppError.notFound("Court not found")
    res.status(200).json({ id: updated.publicId, name: updated.name })
}

export const deleteCourt = async (req: Request, res: Response) => {
    const deleted = await CourtService.deleteCourtByPublicId(req.params.id)
    if (!deleted) throw AppError.notFound("Court not found")
    res.status(200).json({ message: "Court deleted successfully" })
}

export const rotateStreamKey = async (req: Request, res: Response) => {
    const court = await CourtService.rotateStreamKey(req.params.id)
    logger.info({ courtId: court.publicId }, "stream_key_rotated")
    res.status(200).json(toAdminCourt(court, true))
}

export const getCourtPublishTarget = async (req: Request, res: Response) => {
    const court = await CourtService.findCourtByPublicId(req.params.id)
    if (!court?.cameraPath || !court.streamKey) throw AppError.notFound("Court not found")
    logger.info({ courtId: court.publicId }, "stream_target_revealed")
    res.status(200).json({
        cameraPath: court.cameraPath,
        streamKey: court.streamKey,
    })
}

const mediaAuthSecret = (req: Request): string => {
    const header = req.get("x-internal-token") || ""
    if (header) return header
    const authorization = req.get("authorization") || ""
    const match = authorization.match(/^Basic\s+(.+)$/i)
    if (!match) return ""
    const decoded = Buffer.from(match[1], "base64").toString("utf8")
    const separator = decoded.indexOf(":")
    if (separator < 0) return ""
    return decoded.slice(separator + 1)
}

export const verifyStream = async (req: Request, res: Response) => {
    const header = mediaAuthSecret(req)
    if (!header || !safeEqual(header, config.MEDIA_AUTH_SECRET)) {
        throw AppError.unauthorized()
    }
    const action = String(req.body.action || "")
    if (action === "read" || action === "playback") {
        res.status(200).send("OK")
        return
    }
    if (action !== "publish") {
        throw AppError.forbidden("Acción no soportada")
    }
    const streamPath = String(req.body.path || "")
    await CourtService.verifyStream(streamPath, config.MEDIA_AUTH_SECRET)
    res.status(200).send("OK")
}
