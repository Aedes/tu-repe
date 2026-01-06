import { Request, Response } from "express"
import { Club } from "../models/Club"
import { ClubService } from "../services/ClubService"

export const createClub = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const { name, openTime, closeTime, appointmentDuration } = req.body

        const club = new Club(name, openTime, closeTime, appointmentDuration)
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
        const { name, openTime, closeTime, appointmentDuration } = req.body
        const updatedClub = await ClubService.updateClub(clubId, { name, openTime, closeTime, appointmentDuration })

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