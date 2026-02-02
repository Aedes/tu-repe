import { Router } from "express";
import { createClub, deleteClub, deleteClubImage, getAllClubs, getAllClubsWithCourts, getClubById, updateClub, updateClubImage, updateClubTheme } from "../controllers/club.controller";
import { authAdmin } from "../middlewares/auth.middleware";
import { uploadImages } from "../middlewares/upload.middleware";

export const clubRouter = Router();

clubRouter.post("/", authAdmin, createClub)
clubRouter.get("/", getAllClubs)
clubRouter.get("/c/:id", getClubById)
clubRouter.get("/with-courts", getAllClubsWithCourts)
clubRouter.put("/c/:id", authAdmin, updateClub)
clubRouter.put("/c/:id/theme", authAdmin, updateClubTheme)
clubRouter.put("/c/:id/:context", authAdmin, uploadImages.single("image"), updateClubImage)
clubRouter.delete("/c/:id/:context", authAdmin, deleteClubImage)
clubRouter.delete("/c/:id", authAdmin, deleteClub)