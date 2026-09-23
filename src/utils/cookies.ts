import { CookieOptions, Response } from "express"
import { config } from "../config/config"

export const ADMIN_COOKIE = "tu_repe_admin"
export const USER_COOKIE = "tu_repe_user"

const baseCookie = (maxAgeMs: number): CookieOptions => ({
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "strict",
    path: "/api",
    maxAge: maxAgeMs,
})

export const setAuthCookie = (res: Response, kind: "admin" | "user", token: string) => {
    const name = kind === "admin" ? ADMIN_COOKIE : USER_COOKIE
    const maxAge = kind === "admin" ? 2 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
    res.cookie(name, token, baseCookie(maxAge))
}

export const clearAuthCookies = (res: Response) => {
    const clear = { ...baseCookie(0), maxAge: 0 }
    res.clearCookie(ADMIN_COOKIE, clear)
    res.clearCookie(USER_COOKIE, clear)
}
