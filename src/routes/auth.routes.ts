import { Router } from "express";
import { checkAdmin, loginAdmin, loginUser } from "../controllers/auth.controller";

export const authRouter = Router();

authRouter.post("/admin/login", loginAdmin)
authRouter.get("/admin/check-admin", checkAdmin)
authRouter.post("/user/login", loginUser)