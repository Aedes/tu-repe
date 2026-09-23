import { Router } from "express"
import { handleMulter, uploadWebm } from "../middlewares/upload.middleware"
import { convertToMp4 } from "../controllers/clip.controller"
import { clipLimiter } from "../middlewares/rateLimit.middleware"

export const clipRouter = Router()

clipRouter.post("/convert", clipLimiter, handleMulter(uploadWebm.single("clip")), convertToMp4)
