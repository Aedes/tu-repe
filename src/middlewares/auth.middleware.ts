import jwt, { SignOptions } from "jsonwebtoken"
import { NextFunction, Request, Response } from "express"
import { config } from "../config/config"
import { AppError } from "../errors/AppError"
import { UserService } from "../services/UserService"
import { ADMIN_COOKIE, USER_COOKIE } from "../utils/cookies"

export interface AuthPayload {
    sub: string
    role: "admin" | "user"
    tokenVersion: number
}

const verifyOptions = {
    algorithms: ["HS256" as const],
    issuer: config.JWT_ISSUER,
    audience: config.JWT_AUDIENCE,
}

export const signAuthToken = (payload: AuthPayload, expiresIn: string) => {
    const options: SignOptions = {
        algorithm: "HS256",
        expiresIn: expiresIn as SignOptions["expiresIn"],
        issuer: config.JWT_ISSUER,
        audience: config.JWT_AUDIENCE,
    }
    return jwt.sign(payload, config.JWT_SECRET, options)
}

const readToken = (req: Request, cookieName: string) => {
    const fromCookie = req.cookies?.[cookieName]
    if (fromCookie) return fromCookie
    const header = req.headers.authorization
    if (header?.startsWith("Bearer ")) return header.slice(7)
    return null
}

const authenticate = async (req: Request, expectedRole: "admin" | "user") => {
    const token = readToken(req, expectedRole === "admin" ? ADMIN_COOKIE : USER_COOKIE)
    if (!token) throw AppError.unauthorized()

    let payload: AuthPayload
    try {
        payload = jwt.verify(token, config.JWT_SECRET, verifyOptions) as AuthPayload
    } catch {
        throw AppError.unauthorized("Token inválido")
    }

    if (payload.role !== expectedRole) {
        throw AppError.forbidden()
    }

    const user = await UserService.findUserByPublicId(payload.sub)
    if (!user?.id || !user.isActive) {
        throw AppError.unauthorized()
    }
    if ((user.tokenVersion || 0) !== payload.tokenVersion) {
        throw AppError.unauthorized()
    }
    if (expectedRole === "admin" && user.systemRole !== "ADMIN") {
        throw AppError.forbidden()
    }
    if (expectedRole === "user" && user.systemRole !== "USER") {
        throw AppError.forbidden()
    }

    req.user = {
        id: user.id,
        publicId: user.publicId!,
        role: expectedRole,
        tokenVersion: user.tokenVersion || 0,
    }
}

export const authAdmin = async (req: Request, _res: Response, next: NextFunction) => {
    await authenticate(req, "admin")
    next()
}

export const authUser = async (req: Request, _res: Response, next: NextFunction) => {
    await authenticate(req, "user")
    next()
}

export const requireOwnerOfClub = async (req: Request, _res: Response, next: NextFunction) => {
    const userId = req.user?.id
    const clubId = req.params.id
    if (!userId || !clubId) throw AppError.unauthorized()
    const isOwner = await UserService.requireOwnerOfClub(String(userId), clubId)
    if (!isOwner) throw AppError.forbidden()
    next()
}

export const requireOwnerOfCourt = async (req: Request, _res: Response, next: NextFunction) => {
    const userId = req.user?.id
    const courtId = req.params.id
    if (!userId || !courtId) throw AppError.unauthorized()
    const isOwner = await UserService.requireOwnerOfCourt(String(userId), courtId)
    if (!isOwner) throw AppError.forbidden()
    next()
}
