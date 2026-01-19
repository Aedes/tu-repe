import { Router } from "express";
import { createCourt, deleteCourt, getAllCourts, getCourtById, getCourtsByClubId, updateCourt } from "../controllers/court.controller";
import { authAdmin } from "../middlewares/auth.middleware";

export const courtRouter = Router()

courtRouter.post("/", authAdmin, createCourt)
courtRouter.get("/", getAllCourts)
courtRouter.get("/c/:id", getCourtById)
courtRouter.get("/cl/:id", getCourtsByClubId)
courtRouter.put("/c/:id", updateCourt)
courtRouter.delete("/c/:id", authAdmin, deleteCourt)