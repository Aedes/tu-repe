import pino from "pino"

const redactPaths = [
    "req.headers.authorization",
    "req.headers.cookie",
    "req.headers['x-csrf-token']",
    "res.headers['set-cookie']",
    "password",
    "passwordHash",
    "token",
    "streamKey",
    "cameraPath",
    "b2FilePath",
    "*.password",
    "*.token",
    "*.secret",
    "*.authorization",
]

export const logger = pino({
    level: process.env.NODE_ENV === "test" ? "silent" : process.env.LOG_LEVEL || "info",
    redact: {
        paths: redactPaths,
        censor: "[REDACTED]",
    },
    timestamp: pino.stdTimeFunctions.isoTime,
})
