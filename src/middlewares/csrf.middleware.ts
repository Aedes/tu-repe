import { NextFunction, Request, Response } from "express"
import { randomUUID } from "crypto"
import { timingSafeEqual } from "crypto"
import { AppError } from "../errors/AppError"
import { config } from "../config/config"

export const CSRF_COOKIE = "tu_repe_csrf"

export const attachRequestId = (req: Request, res: Response, next: NextFunction) => {
    req.requestId = randomUUID()
    res.setHeader("x-request-id", req.requestId)
    next()
}

export const issueCsrfToken = (req: Request, res: Response, next: NextFunction) => {
    let token = req.cookies?.[CSRF_COOKIE]
    if (!token) {
        token = randomUUID()
        res.cookie(CSRF_COOKIE, token, {
            httpOnly: false,
            secure: config.cookieSecure,
            sameSite: "strict",
            path: "/",
        })
    }
    req.csrfToken = token
    next()
}

const safeEqual = (a: string, b: string) => {
    const left = Buffer.from(a)
    const right = Buffer.from(b)
    if (left.length !== right.length) return false
    return timingSafeEqual(left, right)
}

export const requireCsrf = (req: Request, _res: Response, next: NextFunction) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        return next()
    }

    const origin = req.get("origin")
    if (origin && origin !== config.FRONTEND_ORIGIN) {
        throw AppError.forbidden("Origen no permitido")
    }

    const header = req.get("x-csrf-token") || ""
    const cookie = req.cookies?.[CSRF_COOKIE] || ""
    if (!header || !cookie || !safeEqual(header, cookie)) {
        throw AppError.forbidden("CSRF inválido")
    }
    next()
}
