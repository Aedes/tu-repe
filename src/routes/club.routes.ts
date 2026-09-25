import { Router } from "express"
import {
    createClub,
    deleteClub,
    deleteClubImage,
    getAllClubs,
    getAllClubsWithCourts,
    getClubById,
    getClubByUrlId,
    updateClub,
    updateClubImage,
    updateClubTheme,
} from "../controllers/club.controller"
import { authAdmin } from "../middlewares/auth.middleware"
import { handleMulter, uploadImages } from "../middlewares/upload.middleware"
import { validateBody, validateParams } from "../middlewares/validate.middleware"
import { clubCreateSchema, clubThemeSchema, clubUpdateSchema } from "../validators/schemas"
import { idParamSchema, imageContextParamSchema, urlIdParamSchema } from "../validators/params"
import { adminLimiter } from "../middlewares/rateLimit.middleware"

export const clubRouter = Router()

clubRouter.post("/", authAdmin, adminLimiter, validateBody(clubCreateSchema), createClub)
clubRouter.get("/", getAllClubs)
clubRouter.get("/c/:id", validateParams(idParamSchema), getClubById)
clubRouter.get("/c-url/:urlId", validateParams(urlIdParamSchema), getClubByUrlId)
clubRouter.get("/with-courts", authAdmin, getAllClubsWithCourts)
clubRouter.put("/c/:id", authAdmin, adminLimiter, validateParams(idParamSchema), validateBody(clubUpdateSchema), updateClub)
clubRouter.put("/c/:id/theme", authAdmin, adminLimiter, validateParams(idParamSchema), validateBody(clubThemeSchema), updateClubTheme)
clubRouter.put("/c/:id/:context", authAdmin, adminLimiter, validateParams(imageContextParamSchema), handleMulter(uploadImages.single("image")), updateClubImage)
clubRouter.delete("/c/:id/:context", authAdmin, adminLimiter, validateParams(imageContextParamSchema), deleteClubImage)
clubRouter.delete("/c/:id", authAdmin, adminLimiter, validateParams(idParamSchema), deleteClub)
