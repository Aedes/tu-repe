import { Request, Response } from "express";
import { CourtService } from "../services/CourtService";
import { Court } from "../models/Court";
import { ClubService } from "../services/ClubService";
import { mapPublicId, mapPublicIdArray } from "../utils/publicIdResponse";

export const createCourt = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const { name, clubId: clubPublicId, cameraHost } = req.body
        const clubId = await ClubService.resolveClubId(clubPublicId)

        const existingCourts = await CourtService.getCourtsByClubId(clubId)
        const nextCourtNumber = existingCourts.length + 1

        const streamKey = CourtService.generateStreamKey(nextCourtNumber.toString())
        const cameraPath = `club_${clubId}/${streamKey}`

        const court = new Court(clubId, name, cameraHost, cameraPath, streamKey)
        const newCourt = await CourtService.createCourt(court)

        if (!newCourt) {
            return res.status(400).json({ message: "Error creating court" })
        }

        return res.status(201).json(mapPublicId(newCourt))
    } catch (error: any) {
        console.error(error)
        res.status(500).json({ message: error.message })
    }
}

export const getAllCourts = async (_req: Request, res: Response): Promise<void | Response> => {
    try {
        const courts = await CourtService.getAllCourts()
        return res.status(200).json(mapPublicIdArray(courts))
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const getCourtById = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const courtPublicId = req.params.id
        const court = await CourtService.findCourtByPublicId(courtPublicId)

        if (!court) {
            return res.status(404).json({ message: "Court not found" })
        }

        return res.status(200).json(mapPublicId(court))
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const getCourtsByClubId = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const clubPublicId = req.params.id
        const courts = await CourtService.getCourtsByClubPublicId(clubPublicId)
        return res.status(200).json(mapPublicIdArray(courts))
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const updateCourt = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const courtPublicId = req.params.id
        const { name } = req.body
        const updatedCourt = await CourtService.updateCourtByPublicId(courtPublicId, { name })

        if (!updatedCourt) {
            return res.status(404).json({ message: "Court not found" })
        }

        return res.status(200).json(mapPublicId(updatedCourt))
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const updateCourtAdmin = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const courtPublicId = req.params.id

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

        const updatedCourt = await CourtService.updateCourtByPublicId(courtPublicId, updateData)

        if (!updatedCourt) {
            return res.status(404).json({ message: "Court not found" })
        }

        return res.status(200).json(mapPublicId(updatedCourt))
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const updateCourtUser = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const courtPublicId = req.params.id

        const updatableFields = [
            "name",
        ];
        const updateData: any = {};
        for (const field of updatableFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }

        const updatedCourt = await CourtService.updateCourtByPublicId(courtPublicId, updateData)

        if (!updatedCourt) {
            return res.status(404).json({ message: "Court not found" })
        }

        return res.status(200).json(mapPublicId(updatedCourt))
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const deleteCourt = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const courtPublicId = req.params.id
        const deleted = await CourtService.deleteCourtByPublicId(courtPublicId)

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
