import { Router } from "express";
import { uploadWebm } from "../middlewares/upload.middleware";
import { convertToMp4 } from "../controllers/clip.controller";

export const clipRouter = Router()

clipRouter.post("/convert", uploadWebm.single("clip"), convertToMp4)