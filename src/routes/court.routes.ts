import { Router } from "express";
import { createCourt, deleteCourt, getAllCourts, getCourtById, getCourtsByClubId, getCourtsByClubUrlId, updateCourt, updateCourtAdmin, verifyStream } from "../controllers/court.controller";
import { authAdmin } from "../middlewares/auth.middleware";

export const courtRouter = Router()

courtRouter.post("/", authAdmin, createCourt)
courtRouter.post("/rtmp/start", verifyStream)
courtRouter.get("/", getAllCourts)
courtRouter.get("/c/:id", getCourtById)
courtRouter.get("/cl/:id", getCourtsByClubId)
courtRouter.get("/cl-url/:urlId", getCourtsByClubUrlId)
courtRouter.put("/c/:id", updateCourt)
courtRouter.put("/c/:id/admin", authAdmin, updateCourtAdmin)
courtRouter.delete("/c/:id", authAdmin, deleteCourt)