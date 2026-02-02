import { Request, Response } from "express";
import { CourtService } from "../services/CourtService";
import { Court } from "../models/Court";

export const createCourt = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const { name, clubId, cameraHost } = req.body

        const existingCourts = await CourtService.getCourtsByClubId(clubId)
        const nextCourtNumber = existingCourts.length + 1

        const streamKey = CourtService.generateStreamKey(nextCourtNumber.toString())
        const cameraPath = `club_${clubId}/${streamKey}`

        const court = new Court(clubId, name, cameraHost, cameraPath, streamKey)
        const newCourt = await CourtService.createCourt(court)

        if (!newCourt) {
            return res.status(400).json({ message: "Error creating court" })
        }

        return res.status(201).json(newCourt)
    } catch (error: any) {
        console.error(error)
        res.status(500).json({ message: error.message })
    }
}

export const getAllCourts = async (_req: Request, res: Response): Promise<void | Response> => {
    try {
        const courts = await CourtService.getAllCourts()
        return res.status(200).json(courts)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const getCourtById = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const courtId = parseInt(req.params.id, 10)
        const court = await CourtService.findCourtById(courtId)

        if (!court) {
            return res.status(404).json({ message: "Court not found" })
        }

        return res.status(200).json(court)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const getCourtsByClubId = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const clubId = parseInt(req.params.id, 10)
        const courts = await CourtService.getCourtsByClubId(clubId)
        return res.status(200).json(courts)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const updateCourt = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const courtId = parseInt(req.params.id, 10)
        const { name } = req.body
        const updatedCourt = await CourtService.updateCourt(courtId, { name })

        if (!updatedCourt) {
            return res.status(404).json({ message: "Court not found" })
        }

        return res.status(200).json(updatedCourt)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const updateCourtAdmin = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const courtId = parseInt(req.params.id, 10)

        const updatableFields = [
            "name",
            "cameraHost",
        ];
        const updateData: any = {};
        for (const field of updatableFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }

        const updatedCourt = await CourtService.updateCourt(courtId, updateData)

        if (!updatedCourt) {
            return res.status(404).json({ message: "Court not found" })
        }

        return res.status(200).json(updatedCourt)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const updateCourtUser = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const courtId = parseInt(req.params.id, 10)

        const updatableFields = [
            "name",
        ];
        const updateData: any = {};
        for (const field of updatableFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }

        const updatedCourt = await CourtService.updateCourt(courtId, updateData)

        if (!updatedCourt) {
            return res.status(404).json({ message: "Court not found" })
        }

        return res.status(200).json(updatedCourt)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const deleteCourt = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const courtId = parseInt(req.params.id, 10)
        const deleted = await CourtService.deleteCourt(courtId)

        if (!deleted) {
            return res.status(404).json({ message: "Court not found" })
        }

        return res.status(200).json({ message: "Court deleted successfully" })
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const verifyStream = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const { action, path } = req.body

        if (action === "publish") {
            console.log("Solicitud de streaming recibica. Verificando...")
            if (!path) {
                return res.status(400).send('Missing path');
            }

            const isValidStreaming = await CourtService.verifyStream(path)

            if (!isValidStreaming) {
                return res.status(400).send('Invalid Stream Key');
            }
            console.log("Streaming válido.")
        }

        return res.status(200).send('OK');
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}