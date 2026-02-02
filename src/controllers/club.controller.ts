import { Request, Response } from "express"
import { Club } from "../models/Club"
import { ClubService } from "../services/ClubService"

export const createClub = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const {
            name,
            openTime,
            closeTime,
            appointmentDuration,
            country,
            province,
            city,
            address,
            phone,
            instagramHandle,
            description
        } = req.body

        const club = new Club(name, openTime, closeTime, appointmentDuration, country, province, city, address, phone, instagramHandle, description)
        const newClub = await ClubService.createClub(club)

        if (!newClub) {
            return res.status(400).json({ message: "Error creating club" })
        }

        return res.status(201).json(newClub)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const getAllClubs = async (_req: Request, res: Response): Promise<void | Response> => {
    try {
        const clubs = await ClubService.getAllClubs()
        return res.status(200).json(clubs)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const getAllClubsWithCourts = async (_req: Request, res: Response): Promise<void | Response> => {
    try {
        const clubs = await ClubService.getAllClubsWithCourts()
        return res.status(200).json(clubs)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const getClubById = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const clubId = parseInt(req.params.id, 10)
        const club = await ClubService.findClubById(clubId)

        if (!club) {
            return res.status(404).json({ message: "Club not found" })
        }

        return res.status(200).json(club)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const updateClub = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const clubId = parseInt(req.params.id, 10)
        const updatableFields = [
            "name",
            "openTime",
            "closeTime",
            "appointmentDuration",
            "country",
            "province",
            "city",
            "address",
            "phone",
            "instagramHandle",
            "description"
        ];
        const updateData: any = {};
        for (const field of updatableFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }

        const updatedClub = await ClubService.updateClub(clubId, updateData)

        if (!updatedClub) {
            return res.status(404).json({ message: "Club not found" })
        }

        return res.status(200).json(updatedClub)
    } catch (error: any) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

export const updateClubImage = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const clubId = parseInt(req.params.id, 10)
        const imageContext = req.params.context

        if (imageContext === "logo" || imageContext === "cover") {
            if (!req.file) {
                return res.status(400).json({ message: "No file uploaded" })
            }

            const updatedClub = await ClubService.updateClubImage(clubId, req.file, imageContext)

            if (!updatedClub) {
                return res.status(404).json({ message: "Club not found" })
            }

            return res.status(200).json(updatedClub)
        }

        return res.status(400).json({ message: "Invalid image context" })
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const deleteClubImage = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const clubId = parseInt(req.params.id, 10)
        const imageContext = req.params.context

        if (imageContext === "logo" || imageContext === "cover") {
            const updatedClub = await ClubService.deleteClubImage(clubId, imageContext)

            if (!updatedClub) {
                return res.status(404).json({ message: "Club not found" })
            }

            return res.status(200).json(updatedClub)
        }

        return res.status(400).json({ message: "Invalid image context" })
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const updateClubTheme = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const clubId = parseInt(req.params.id, 10)
        const { theme } = req.body

        if (!theme || !theme.primary || !theme.secondary || !theme.background) {
            return res.status(400).json({ message: "Theme must include primary, secondary, and background colors" })
        }

        const updatedClub = await ClubService.updateClubTheme(clubId, theme)

        if (!updatedClub) {
            return res.status(404).json({ message: "Club not found" })
        }

        return res.status(200).json(updatedClub)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const deleteClub = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const clubId = parseInt(req.params.id, 10)
        const deleted = await ClubService.deleteClub(clubId)

        if (!deleted) {
            return res.status(404).json({ message: "Club not found" })
        }

        return res.status(200).json({ message: "Club deleted successfully" })
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}