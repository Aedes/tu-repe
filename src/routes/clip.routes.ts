import { Router } from "express"
import { handleMulter, uploadWebm } from "../middlewares/upload.middleware"
import { convertToMp4, extractClip } from "../controllers/clip.controller"
import { clipLimiter } from "../middlewares/rateLimit.middleware"
import { validateBody } from "../middlewares/validate.middleware"
import { clipExtractSchema } from "../validators/schemas"

export const clipRouter = Router()

clipRouter.post("/extract", clipLimiter, validateBody(clipExtractSchema), extractClip)
clipRouter.post("/convert", clipLimiter, handleMulter(uploadWebm.single("clip")), convertToMp4)
