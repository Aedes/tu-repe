import { Router } from "express"
import { authAdmin, authUser, requireOwnerOfClub, requireOwnerOfCourt } from "../middlewares/auth.middleware"
import {
    assingOwnerToClub,
    createUser,
    deleteUser,
    getAllUsersWithCourts,
    getUserWithClubs,
    unassingOwnerToClub,
    updateUser,
} from "../controllers/user.controller"
import { deleteClubImage, updateClub, updateClubImage, updateClubTheme } from "../controllers/club.controller"
import { handleMulter, uploadImages } from "../middlewares/upload.middleware"
import { updateCourtUser } from "../controllers/court.controller"
import { validateBody, validateParams } from "../middlewares/validate.middleware"
import {
    clubThemeSchema,
    courtOwnerUpdateSchema,
    createUserSchema,
    ownerAssignSchema,
    ownerClubUpdateSchema,
    updateUserSchema,
} from "../validators/schemas"
import { idParamSchema, imageContextParamSchema } from "../validators/params"
import { adminLimiter } from "../middlewares/rateLimit.middleware"

export const userRouter = Router()

userRouter.post("/", authAdmin, adminLimiter, validateBody(createUserSchema), createUser)
userRouter.post("/cu", authAdmin, adminLimiter, validateBody(ownerAssignSchema), assingOwnerToClub)
userRouter.get("/", authAdmin, getAllUsersWithCourts)
userRouter.get("/clubs", authUser, getUserWithClubs)
userRouter.put("/c/:id", authUser, validateParams(idParamSchema), requireOwnerOfClub, validateBody(ownerClubUpdateSchema), updateClub)
userRouter.put("/c/:id/theme", authUser, validateParams(idParamSchema), requireOwnerOfClub, validateBody(clubThemeSchema), updateClubTheme)
userRouter.put("/u/:id", authAdmin, adminLimiter, validateParams(idParamSchema), validateBody(updateUserSchema), updateUser)
userRouter.put("/c/:id/:context", authUser, validateParams(imageContextParamSchema), requireOwnerOfClub, handleMulter(uploadImages.single("image")), updateClubImage)
userRouter.put("/court/:id", authUser, validateParams(idParamSchema), requireOwnerOfCourt, validateBody(courtOwnerUpdateSchema), updateCourtUser)
userRouter.delete("/u/:id", authAdmin, adminLimiter, validateParams(idParamSchema), deleteUser)
userRouter.delete("/cu", authAdmin, adminLimiter, validateBody(ownerAssignSchema), unassingOwnerToClub)
userRouter.delete("/c/:id/:context", authUser, validateParams(imageContextParamSchema), requireOwnerOfClub, deleteClubImage)
