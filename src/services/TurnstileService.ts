import { config } from "../config/config"
import { AppError } from "../errors/AppError"
import { logger } from "../logger"

export class TurnstileService {
    static async verify(token: string, ip?: string) {
        if (config.isTest) return true
        const body = new URLSearchParams({
            secret: config.TURNSTILE_SECRET_KEY,
            response: token,
        })
        if (ip) body.set("remoteip", ip)

        const response = await fetch(config.TURNSTILE_VERIFY_URL, {
            method: "POST",
            body,
        })
        const data = await response.json() as { success?: boolean }
        if (!data.success) {
            logger.warn({ ip }, "turnstile_failed")
            throw AppError.forbidden("Verificación anti-bot fallida")
        }
        return true
    }
}
