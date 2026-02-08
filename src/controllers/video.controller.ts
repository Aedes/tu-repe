import { Request, Response } from "express"
import { VideoService } from "../services/VideoService"
import { Video } from "../models/Video"
import { CourtService } from "../services/CourtService"
import { mapPublicId, mapPublicIdArray } from "../utils/publicIdResponse"

export const createVideo = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const { courtId: courtPublicId, fileName, b2FilePath, startTime, endTime } = req.body

        if (!courtPublicId || !fileName || !b2FilePath || !startTime || !endTime) {
            return res.status(400).json({ message: "Missing required fields." });
        }

        const start = new Date(startTime)
        const end = new Date(endTime)

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: "Invalid date format." });
        }

        if (start >= end) {
            return res.status(400).json({ message: "startTime must be before endTime." });
        }

        const courtId = await CourtService.resolveCourtId(courtPublicId)
        const video = new Video(courtId, fileName, start, end, b2FilePath)
        const newVideo = await VideoService.createVideo(video)

        return res.status(201).json(mapPublicId(newVideo))
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const getAllVideos = async (_req: Request, res: Response): Promise<void | Response> => {
    try {
        const videos = await VideoService.getAllVideos()
        return res.status(200).json(mapPublicIdArray(videos))
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const getVideoById = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const videoPublicId = req.params.id
        const video = await VideoService.findVideoByPublicId(videoPublicId)

        if (!video) return res.status(404).json({ message: "Video not found" })

        return res.status(200).json(mapPublicId(video))
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const getVideosByCourtId = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const courtPublicId = req.params.courtId
        const courtId = await CourtService.resolveCourtId(courtPublicId)
        const videos = await VideoService.getVideosByCourtId(courtId)

        return res.status(200).json(mapPublicIdArray(videos))
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const getVideosByDateRange = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const { startTime, endTime, courtId: courtPublicId } = req.query

        if (!startTime || !endTime || !courtPublicId) {
            return res.status(400).json({ message: "startTime, endTime and courtId are required" })
        }

        const start = new Date(startTime as string)
        const end = new Date(endTime as string)
        const courtId = await CourtService.resolveCourtId(courtPublicId as string)
        const videos = await VideoService.getVideosBetweenDatesAndCourtId(start, end, courtId)

        return res.status(200).json(mapPublicIdArray(videos))

    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const getVideoDownloadUrlsForAppointment = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const { startTime, courtId: courtPublicId } = req.query

        if (!startTime || !courtPublicId) {
            return res.status(400).json({ message: "startTime and courtId are required" })
        }

        const start = new Date(startTime as string)
        const courtId = await CourtService.resolveCourtId(courtPublicId as string)
        const urls = await VideoService.getVideoDownloadUrlsForAppointment(start, courtId)

        return res.status(200).json(urls)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const updateVideo = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const videoPublicId = req.params.id
        const { fileName, b2FilePath, startTime, endTime } = req.body
        const updatedVideo = await VideoService.updateVideoByPublicId(videoPublicId, {
            fileName,
            b2FilePath,
            startTime: startTime ? new Date(startTime) : undefined,
            endTime: endTime ? new Date(endTime) : undefined
        })

        if (!updatedVideo) {
            return res.status(404).json({ message: "Video not found" })
        }

        return res.status(200).json(mapPublicId(updatedVideo))
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const deleteVideo = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const videoPublicId = req.params.id
        const deleted = await VideoService.deleteVideoByPublicId(videoPublicId)

        if (!deleted) {
            return res.status(404).json({ message: "Video not found" })
        }

        return res.status(200).json({ message: "Video deleted successfully" })

    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}
