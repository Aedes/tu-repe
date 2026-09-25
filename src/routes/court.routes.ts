import { Router } from "express"
import {
    createCourt,
    deleteCourt,
    getAllCourts,
    getCourtById,
    getCourtsByClubId,
    getCourtsByClubUrlId,
    getCourtPublishTarget,
    rotateStreamKey,
    updateCourtAdmin,
} from "../controllers/court.controller"
import { authAdmin } from "../middlewares/auth.middleware"
import { validateBody, validateParams } from "../middlewares/validate.middleware"
import { courtAdminUpdateSchema, courtCreateSchema } from "../validators/schemas"
import { idParamSchema, urlIdParamSchema } from "../validators/params"
import { adminLimiter } from "../middlewares/rateLimit.middleware"

export const courtRouter = Router()

courtRouter.post("/", authAdmin, adminLimiter, validateBody(courtCreateSchema), createCourt)
courtRouter.get("/", authAdmin, getAllCourts)
courtRouter.get("/c/:id", authAdmin, validateParams(idParamSchema), getCourtById)
courtRouter.get("/cl/:id", authAdmin, validateParams(idParamSchema), getCourtsByClubId)
courtRouter.get("/cl-url/:urlId", validateParams(urlIdParamSchema), getCourtsByClubUrlId)
courtRouter.put("/c/:id/admin", authAdmin, adminLimiter, validateParams(idParamSchema), validateBody(courtAdminUpdateSchema), updateCourtAdmin)
courtRouter.post("/c/:id/rotate-stream-key", authAdmin, adminLimiter, validateParams(idParamSchema), rotateStreamKey)
courtRouter.get("/c/:id/publish-target", authAdmin, adminLimiter, validateParams(idParamSchema), getCourtPublishTarget)
courtRouter.delete("/c/:id", authAdmin, adminLimiter, validateParams(idParamSchema), deleteCourt)
