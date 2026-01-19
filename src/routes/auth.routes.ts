import { Router } from "express";
import { checkAdmin, loginAdmin } from "../controllers/auth.controller";

export const authRouter = Router();

authRouter.post("/admin/login", loginAdmin)
authRouter.get("/admin/check-admin", checkAdmin)