import { Request, Response } from "express"
import { VideoService } from "../services/VideoService"
import { Video } from "../models/Video"

export const createVideo = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const { courtId, fileName, b2Url, startTime, endTime } = req.body

        if (!courtId || !fileName || !b2Url || !startTime || !endTime) {
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

        const video = new Video(courtId, fileName, start, end, b2Url)
        const newVideo = await VideoService.createVideo(video)

        return res.status(201).json(newVideo)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const getAllVideos = async (_req: Request, res: Response): Promise<void | Response> => {
    try {
        const videos = await VideoService.getAllVideos()
        return res.status(200).json(videos)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const getVideoById = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const videoId = parseInt(req.params.id, 10)
        const video = await VideoService.findVideoById(videoId)

        if (!video) return res.status(404).json({ message: "Video not found" })

        return res.status(200).json(video)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const getVideosByCourtId = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const courtId = parseInt(req.params.courtId, 10)
        const videos = await VideoService.getVideosByCourtId(courtId)

        return res.status(200).json(videos)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const getVideosByDateRange = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const { startTime, endTime, courtId } = req.query

        if (!startTime || !endTime) {
            return res.status(400).json({ message: "startTime and endTime are required" })
        }

        const start = new Date(startTime as string)
        const end = new Date(endTime as string)

        let videos

        if (courtId) {
            videos = await VideoService.getVideosBetweenDatesAndCourtId(start, end, parseInt(courtId as string, 10))
        } else {
            videos = await VideoService.getVideosBetweenDates(start, end)
        }

        return res.status(200).json(videos)

    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const updateVideo = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const videoId = parseInt(req.params.id, 10)
        const { fileName, b2Url, startTime, endTime } = req.body
        const updatedVideo = await VideoService.updateVideo(videoId, {
            fileName,
            b2Url,
            startTime: startTime ? new Date(startTime) : undefined,
            endTime: endTime ? new Date(endTime) : undefined
        })

        if (!updatedVideo) {
            return res.status(404).json({ message: "Video not found" })
        }

        return res.status(200).json(updatedVideo)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const deleteVideo = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const videoId = parseInt(req.params.id, 10)
        const deleted = await VideoService.deleteVideo(videoId)

        if (!deleted) {
            return res.status(404).json({ message: "Video not found" })
        }

        return res.status(200).json({ message: "Video deleted successfully" })

    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}