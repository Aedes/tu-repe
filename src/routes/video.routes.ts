import { Router } from "express"
import {
    createVideo,
    deleteVideo,
    getAllVideos,
    getVideoById,
    getVideoDownloadUrlsForAppointment,
    createAppointmentRender,
    getAppointmentRender,
    getVideosByCourtId,
    getVideosByDateRange,
    updateVideo,
} from "../controllers/video.controller"
import { authAdmin } from "../middlewares/auth.middleware"
import { validateBody, validateParams, validateQuery } from "../middlewares/validate.middleware"
import { videoCreateSchema, videoRangeQuerySchema, videoRenderBodySchema, videoUpdateSchema, videoUrlsQuerySchema } from "../validators/schemas"
import { courtIdParamSchema, idParamSchema, jobIdParamSchema } from "../validators/params"
import { adminLimiter, renderLimiter, renderStatusLimiter, searchLimiter } from "../middlewares/rateLimit.middleware"

export const videoRouter = Router()

videoRouter.post("/", authAdmin, adminLimiter, validateBody(videoCreateSchema), createVideo)
videoRouter.get("/", authAdmin, getAllVideos)
videoRouter.get("/v/:id", authAdmin, validateParams(idParamSchema), getVideoById)
videoRouter.get("/c/:courtId", authAdmin, validateParams(courtIdParamSchema), getVideosByCourtId)
videoRouter.get("/range", authAdmin, validateQuery(videoRangeQuerySchema), getVideosByDateRange)
videoRouter.get("/urls", searchLimiter, validateQuery(videoUrlsQuerySchema), getVideoDownloadUrlsForAppointment)
videoRouter.post("/render", renderLimiter, validateBody(videoRenderBodySchema), createAppointmentRender)
videoRouter.get("/render/:jobId", renderStatusLimiter, validateParams(jobIdParamSchema), getAppointmentRender)
videoRouter.put("/v/:id", authAdmin, adminLimiter, validateParams(idParamSchema), validateBody(videoUpdateSchema), updateVideo)
videoRouter.delete("/v/:id", authAdmin, adminLimiter, validateParams(idParamSchema), deleteVideo)
