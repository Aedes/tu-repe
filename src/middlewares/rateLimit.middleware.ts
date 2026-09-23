import rateLimit, { ipKeyGenerator } from "express-rate-limit"
import { Request } from "express"

const ipKey = (req: Request) => req.ip ? ipKeyGenerator(req.ip) : "unknown"

export const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: ipKey,
})

export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `${ipKey(req)}:${String(req.body?.email || "").toLowerCase()}`,
})

export const adminLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 40,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: ipKey,
})

export const searchLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 15,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: ipKey,
})

export const clipLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 3,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: ipKey,
})
