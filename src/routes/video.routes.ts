import { Router } from "express"
import {
    createVideo,
    deleteVideo,
    getAllVideos,
    getVideoById,
    getVideoDownloadUrlsForAppointment,
    getVideosByCourtId,
    getVideosByDateRange,
    updateVideo,
} from "../controllers/video.controller"
import { authAdmin } from "../middlewares/auth.middleware"
import { validateBody, validateParams, validateQuery } from "../middlewares/validate.middleware"
import { videoCreateSchema, videoRangeQuerySchema, videoUpdateSchema, videoUrlsQuerySchema } from "../validators/schemas"
import { courtIdParamSchema, idParamSchema } from "../validators/params"
import { adminLimiter, searchLimiter } from "../middlewares/rateLimit.middleware"

export const videoRouter = Router()

videoRouter.post("/", authAdmin, adminLimiter, validateBody(videoCreateSchema), createVideo)
videoRouter.get("/", authAdmin, getAllVideos)
videoRouter.get("/v/:id", authAdmin, validateParams(idParamSchema), getVideoById)
videoRouter.get("/c/:courtId", authAdmin, validateParams(courtIdParamSchema), getVideosByCourtId)
videoRouter.get("/range", authAdmin, validateQuery(videoRangeQuerySchema), getVideosByDateRange)
videoRouter.get("/urls", searchLimiter, validateQuery(videoUrlsQuerySchema), getVideoDownloadUrlsForAppointment)
videoRouter.put("/v/:id", authAdmin, adminLimiter, validateParams(idParamSchema), validateBody(videoUpdateSchema), updateVideo)
videoRouter.delete("/v/:id", authAdmin, adminLimiter, validateParams(idParamSchema), deleteVideo)
