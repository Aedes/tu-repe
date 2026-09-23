import { Router } from "express"
import { checkAdmin, checkUser, csrfToken, loginAdmin, loginUser, logoutAdmin, logoutUser } from "../controllers/auth.controller"
import { loginLimiter } from "../middlewares/rateLimit.middleware"
import { validateBody } from "../middlewares/validate.middleware"
import { loginSchema } from "../validators/schemas"
import { authAdmin, authUser } from "../middlewares/auth.middleware"

export const authRouter = Router()

authRouter.get("/csrf", csrfToken)
authRouter.post("/admin/login", loginLimiter, validateBody(loginSchema), loginAdmin)
authRouter.get("/admin/check-admin", authAdmin, checkAdmin)
authRouter.post("/admin/logout", authAdmin, logoutAdmin)
authRouter.post("/user/login", loginLimiter, validateBody(loginSchema), loginUser)
authRouter.get("/user/check-user", authUser, checkUser)
authRouter.post("/user/logout", authUser, logoutUser)
