import { Request, Response } from "express"
import { Club } from "../models/Club"
import { ClubService } from "../services/ClubService"
import { mapPublicId, mapPublicIdArray } from "../utils/publicIdResponse"

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

        const urlId = [...Array(12)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

        const club = new Club(name, openTime, closeTime, appointmentDuration, country, province, city, address, urlId, phone, instagramHandle, description)
        const newClub = await ClubService.createClub(club)

        if (!newClub) {
            return res.status(400).json({ message: "Error creating club" })
        }

        return res.status(201).json(mapPublicId(newClub))
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const getAllClubs = async (_req: Request, res: Response): Promise<void | Response> => {
    try {
        const clubs = await ClubService.getAllClubs()
        return res.status(200).json(mapPublicIdArray(clubs))
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const getAllClubsWithCourts = async (_req: Request, res: Response): Promise<void | Response> => {
    try {
        const clubs = await ClubService.getAllClubsWithCourts()
        const mapped = clubs.map(club => ({
            ...mapPublicId(club),
            courts: club.courts ? mapPublicIdArray(club.courts) : []
        }))
        return res.status(200).json(mapped)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const getClubById = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const clubPublicId = req.params.id
        const club = await ClubService.findClubByPublicId(clubPublicId)

        if (!club) {
            return res.status(404).json({ message: "Club not found" })
        }

        return res.status(200).json(mapPublicId(club))
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const getClubByUrlId = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const clubUrlId = req.params.urlId
        const club = await ClubService.findClubByUrlId(clubUrlId)

        if (!club) {
            return res.status(404).json({ message: "Club not found" })
        }

        return res.status(200).json(mapPublicId(club))
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const updateClub = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const clubPublicId = req.params.id
        const updatableFields = [
            "name",
            "openTime",
            "closeTime",
            "appointmentDuration",
            "country",
            "province",
            "city",
            "address",
            "urlId",
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

        const updatedClub = await ClubService.updateClubByPublicId(clubPublicId, updateData)

        if (!updatedClub) {
            return res.status(404).json({ message: "Club not found" })
        }

        return res.status(200).json(mapPublicId(updatedClub))
    } catch (error: any) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

export const updateClubImage = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const clubPublicId = req.params.id
        const imageContext = req.params.context

        if (imageContext === "logo" || imageContext === "cover") {
            if (!req.file) {
                return res.status(400).json({ message: "No file uploaded" })
            }

            const updatedClub = await ClubService.updateClubImageByPublicId(clubPublicId, req.file, imageContext)

            if (!updatedClub) {
                return res.status(404).json({ message: "Club not found" })
            }

            return res.status(200).json(mapPublicId(updatedClub))
        }

        return res.status(400).json({ message: "Invalid image context" })
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const deleteClubImage = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const clubPublicId = req.params.id
        const imageContext = req.params.context

        if (imageContext === "logo" || imageContext === "cover") {
            const updatedClub = await ClubService.deleteClubImageByPublicId(clubPublicId, imageContext)

            if (!updatedClub) {
                return res.status(404).json({ message: "Club not found" })
            }

            return res.status(200).json(mapPublicId(updatedClub))
        }

        return res.status(400).json({ message: "Invalid image context" })
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const updateClubTheme = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const clubPublicId = req.params.id
        const { theme } = req.body

        if (!theme || !theme.primary || !theme.secondary || !theme.background) {
            return res.status(400).json({ message: "Theme must include primary, secondary, and background colors" })
        }

        const updatedClub = await ClubService.updateClubThemeByPublicId(clubPublicId, theme)

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
        const clubPublicId = req.params.id
        const deleted = await ClubService.deleteClubByPublicId(clubPublicId)

        if (!deleted) {
            return res.status(404).json({ message: "Club not found" })
        }

        return res.status(200).json({ message: "Club deleted successfully" })
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}
