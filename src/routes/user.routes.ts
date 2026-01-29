import { Router } from "express";
import { authAdmin, authUser, requireOwnerOfClub, requireOwnerOfCourt } from "../middlewares/auth.middleware";
import { assingOwnerToClub, createUser, deleteUser, getAllUsersWithCourts, getUserWithClubs, unassingOwnerToClub, updateUser } from "../controllers/user.controller";
import { deleteClubImage, updateClub, updateClubImage } from "../controllers/club.controller";
import { uploadImages } from "../middlewares/upload.middleware";
import { updateCourtUser } from "../controllers/court.controller";

export const userRouter = Router()

userRouter.post("/", authAdmin, createUser)
userRouter.post("/cu", authAdmin, assingOwnerToClub)
userRouter.get("/", authAdmin, getAllUsersWithCourts)
userRouter.get("/clubs", authUser, getUserWithClubs)
userRouter.put("/c/:id", authUser, requireOwnerOfClub, updateClub)
userRouter.put("/u/:id", authAdmin, updateUser)
userRouter.put("/c/:id/:context", authUser, requireOwnerOfClub, uploadImages.single("image"), updateClubImage)
userRouter.put("/court/:id", authUser, requireOwnerOfCourt, updateCourtUser)
userRouter.delete("/u/:id", authAdmin, deleteUser)
userRouter.delete("/cu", authAdmin, unassingOwnerToClub)
userRouter.delete("/c/:id/:context", authUser, requireOwnerOfClub, deleteClubImage)
