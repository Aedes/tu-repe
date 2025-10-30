import { Router } from "express";
import { createClub, deleteClub, getAllClubs, getAllClubsWithCourts, getClubById, updateClub } from "../controllers/club.controller";

export const clubRouter = Router();

clubRouter.post("/", createClub)
clubRouter.get("/", getAllClubs)
clubRouter.get("/c/:id", getClubById)
clubRouter.get("/with-courts", getAllClubsWithCourts)
clubRouter.put("/c/:id", updateClub)
clubRouter.delete("/c/:id", deleteClub)