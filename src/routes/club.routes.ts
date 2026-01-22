import { Router } from "express";
import { createClub, deleteClub, deleteClubImage, getAllClubs, getAllClubsWithCourts, getClubById, updateClub, updateClubImage } from "../controllers/club.controller";
import { authAdmin } from "../middlewares/auth.middleware";
import { uploadImages } from "../middlewares/upload.middleware";

export const clubRouter = Router();

clubRouter.post("/", authAdmin, createClub)
clubRouter.get("/", getAllClubs)
clubRouter.get("/c/:id", getClubById)
clubRouter.get("/with-courts", getAllClubsWithCourts)
clubRouter.put("/c/:id", updateClub)
clubRouter.put("/c/:id/:context", uploadImages.single("image"), updateClubImage)
clubRouter.delete("/c/:id/:context", deleteClubImage)
clubRouter.delete("/c/:id", authAdmin, deleteClub)