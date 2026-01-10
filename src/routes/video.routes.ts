import { Router } from "express";
import { createVideo, deleteVideo, getAllVideos, getVideoById, getVideoDownloadUrlsForAppointment, getVideosByCourtId, getVideosByDateRange, updateVideo } from "../controllers/video.controller";

export const videoRouter = Router()

videoRouter.post("/", createVideo)
videoRouter.get("/", getAllVideos)
videoRouter.get("/v/:id", getVideoById)
videoRouter.get("/c/:courtId", getVideosByCourtId)
videoRouter.get("/range", getVideosByDateRange)
videoRouter.get("/urls", getVideoDownloadUrlsForAppointment)
videoRouter.put("/v/:id", updateVideo)
videoRouter.delete("/v/:id", deleteVideo)