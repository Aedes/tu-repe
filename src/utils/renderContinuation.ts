import { createHmac, timingSafeEqual } from "crypto"
import { config } from "../config/config"

const CONTINUATION_TTL_MS = 10 * 60 * 1000

export type RenderContinuationInput = {
    clubUrlId: string
    courtPublicId: string
    startTime: string
}

const signBody = (body: string) => createHmac("sha256", config.JWT_SECRET).update(body).digest("base64url")

export const signRenderContinuation = (input: RenderContinuationInput): string => {
    const body = Buffer.from(JSON.stringify({
        clubUrlId: input.clubUrlId,
        courtPublicId: input.courtPublicId,
        startTime: input.startTime,
        exp: Date.now() + CONTINUATION_TTL_MS,
    })).toString("base64url")
    return `${body}.${signBody(body)}`
}

export const verifyRenderContinuation = (token: string, expected: RenderContinuationInput): boolean => {
    const separator = token.lastIndexOf(".")
    if (separator <= 0) return false
    const body = token.slice(0, separator)
    const signature = token.slice(separator + 1)
    const actual = signBody(body)
    const left = Buffer.from(signature)
    const right = Buffer.from(actual)
    if (left.length !== right.length || !timingSafeEqual(left, right)) return false
    try {
        const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
            clubUrlId?: string
            courtPublicId?: string
            startTime?: string
            exp?: number
        }
        return data.clubUrlId === expected.clubUrlId
            && data.courtPublicId === expected.courtPublicId
            && data.startTime === expected.startTime
            && typeof data.exp === "number"
            && data.exp > Date.now()
    } catch {
        return false
    }
}
