import { Router } from "express";
import { authAdmin } from "../middlewares/auth.middleware";
import { assingOwnerToClub, createUser, deleteUser, getAllUsersWithCourts, unassingOwnerToClub, updateUser } from "../controllers/user.controller";

export const userRouter = Router()

userRouter.post("/", authAdmin, createUser)
userRouter.post("/cu", authAdmin, assingOwnerToClub)
userRouter.get("/", authAdmin, getAllUsersWithCourts)
userRouter.put("/u/:id", authAdmin, updateUser)
userRouter.delete("/u/:id", authAdmin, deleteUser)
userRouter.delete("/cu", authAdmin, unassingOwnerToClub)

