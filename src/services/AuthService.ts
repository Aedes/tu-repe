import { UserService } from "./UserService"
import { TotpService } from "./TotpService"
import { signAuthToken } from "../middlewares/auth.middleware"
import { AppError } from "../errors/AppError"
import { config } from "../config/config"
import { Response } from "express"
import { clearAuthCookies, setAuthCookie } from "../utils/cookies"
import { logger } from "../logger"

const invalid = () => AppError.unauthorized("Credenciales inválidas")

export class AuthService {
    static async loginAdmin(email: string, password: string, totp: string | undefined, res: Response) {
        const user = await UserService.findUserByEmail(email.toLowerCase())
        if (!user?.id || user.systemRole !== "ADMIN" || user.isActive === false) {
            throw invalid()
        }
        const matches = await UserService.comparePassword(password, user.passwordHash)
        if (!matches) throw invalid()
        if (!user.totpEnabled || !user.totpSecret) throw invalid()
        if (!totp || !TotpService.verify(totp, user.totpSecret)) throw invalid()

        const token = signAuthToken({
            sub: user.publicId!,
            role: "admin",
            tokenVersion: user.tokenVersion || 0,
        }, config.JWT_ADMIN_TTL)
        setAuthCookie(res, "admin", token)
        return { id: user.publicId, name: user.name, email: user.email, role: "admin" }
    }

    static async loginUser(email: string, password: string, res: Response) {
        const user = await UserService.findUserByEmail(email.toLowerCase())
        if (!user?.id || user.systemRole !== "USER" || user.isActive === false) {
            throw invalid()
        }
        const matches = await UserService.comparePassword(password, user.passwordHash)
        if (!matches) throw invalid()

        const token = signAuthToken({
            sub: user.publicId!,
            role: "user",
            tokenVersion: user.tokenVersion || 0,
        }, config.JWT_USER_TTL)
        setAuthCookie(res, "user", token)
        return { id: user.publicId, name: user.name, email: user.email, role: "user" }
    }

    static async logout(kind: "admin" | "user", userId: number | undefined, res: Response) {
        if (userId) {
            await UserService.revokeSessions(userId)
        }
        clearAuthCookies(res)
        logger.info({ kind }, "logout")
        return { ok: true }
    }
}
