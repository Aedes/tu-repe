import { Request, Response } from "express"
import { ClubService } from "../services/ClubService"
import { toAdminClubWithCourts, toPublicClub } from "../dto/responseDtos"
import { generateUrlId } from "../utils/urlId"
import { AppError } from "../errors/AppError"
import { imageContextSchema } from "../validators/schemas"

export const createClub = async (req: Request, res: Response) => {
    const urlId = generateUrlId()
    const newClub = await ClubService.createClub({ ...req.body, urlId })
    res.status(201).json(toPublicClub(newClub))
}

export const getAllClubs = async (_req: Request, res: Response) => {
    const clubs = await ClubService.getAllClubs()
    res.status(200).json(clubs.map(toPublicClub))
}

export const getAllClubsWithCourts = async (_req: Request, res: Response) => {
    const clubs = await ClubService.getAllClubsWithCourts()
    res.status(200).json(clubs.map(toAdminClubWithCourts))
}

export const getClubById = async (req: Request, res: Response) => {
    const club = await ClubService.findClubByPublicId(req.params.id)
    if (!club) throw AppError.notFound("Club not found")
    res.status(200).json(toPublicClub(club))
}

export const getClubByUrlId = async (req: Request, res: Response) => {
    const club = await ClubService.findClubByUrlId(req.params.urlId)
    if (!club) throw AppError.notFound("Club not found")
    res.status(200).json(toPublicClub(club))
}

export const updateClub = async (req: Request, res: Response) => {
    const updated = await ClubService.updateClubByPublicId(req.params.id, req.body)
    if (!updated) throw AppError.notFound("Club not found")
    res.status(200).json(toPublicClub(updated))
}

export const updateClubImage = async (req: Request, res: Response) => {
    const context = imageContextSchema.parse(req.params.context)
    if (!req.file) throw AppError.badRequest("No file uploaded")
    const updated = await ClubService.updateClubImageByPublicId(req.params.id, req.file, context)
    if (!updated) throw AppError.notFound("Club not found")
    res.status(200).json(toPublicClub(updated))
}

export const deleteClubImage = async (req: Request, res: Response) => {
    const context = imageContextSchema.parse(req.params.context)
    const updated = await ClubService.deleteClubImageByPublicId(req.params.id, context)
    if (!updated) throw AppError.notFound("Club not found")
    res.status(200).json(toPublicClub(updated))
}

export const updateClubTheme = async (req: Request, res: Response) => {
    const updated = await ClubService.updateClubThemeByPublicId(req.params.id, req.body.theme)
    if (!updated) throw AppError.notFound("Club not found")
    res.status(200).json(updated)
}

export const deleteClub = async (req: Request, res: Response) => {
    const deleted = await ClubService.deleteClubByPublicId(req.params.id)
    if (!deleted) throw AppError.notFound("Club not found")
    res.status(200).json({ message: "Club deleted successfully" })
}
