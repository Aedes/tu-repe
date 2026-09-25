import dotenv from "dotenv"
import path from "path"
import { z } from "zod"

const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env"
dotenv.config({ path: path.resolve(process.cwd(), envFile) })
if (process.env.NODE_ENV === "test") {
    dotenv.config({ path: path.resolve(process.cwd(), ".env.test.example"), override: false })
}

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    TZ: z.string().default("UTC"),
    FRONTEND_ORIGIN: z.string().url(),
    MYSQL_HOST: z.string().min(1),
    MYSQL_PORT: z.coerce.number().int().positive().default(3306),
    MYSQL_DATABASE: z.string().min(1),
    MYSQL_USER: z.string().min(1),
    MYSQL_PASSWORD: z.string().min(1),
    JWT_SECRET: z.string().min(32),
    JWT_ISSUER: z.string().min(1).default("tu-repe"),
    JWT_AUDIENCE: z.string().min(1).default("tu-repe-web"),
    JWT_ADMIN_TTL: z.string().default("2h"),
    JWT_USER_TTL: z.string().default("7d"),
    B2_ENDPOINT: z.string().url(),
    B2_REGION: z.string().min(1),
    B2_BUCKET_NAME: z.string().min(1),
    B2_APPLICATION_KEY_ID: z.string().min(1),
    B2_APPLICATION_KEY: z.string().min(1),
    CLOUDINARY_CLOUD_NAME: z.string().min(1),
    CLOUDINARY_API_KEY: z.string().min(1),
    CLOUDINARY_API_SECRET: z.string().min(1),
    MEDIA_SERVER_RTSP_BASE_URL: z.string().min(1),
    MEDIA_AUTH_SECRET: z.string().min(16),
    TURNSTILE_SECRET_KEY: z.string().min(1),
    TURNSTILE_VERIFY_URL: z.string().url().default("https://challenges.cloudflare.com/turnstile/v0/siteverify"),
    VIDEO_RETENTION_HOURS: z.coerce.number().int().positive().default(72),
    VIDEO_CHUNK_DURATION_SECONDS: z.coerce.number().int().positive().default(900),
    VIDEO_RECORDING_MODE: z.enum(["copy", "transcode"]).default("copy"),
    VIDEO_DIR: z.string().min(1).default("/var/videos"),
    UPLOAD_DIR: z.string().min(1).default("./uploads"),
    STABILITY_THRESHOLD_MS: z.coerce.number().int().positive().default(10_000),
    APPOINTMENT_MERGE_ENABLED: z.enum(["true", "false"]).default("true"),
    APPOINTMENT_MERGE_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
    APPOINTMENT_MERGE_FFMPEG_TIMEOUT_MS: z.coerce.number().int().positive().default(300_000),
    APPOINTMENT_MERGE_WORKER_INTERVAL_MS: z.coerce.number().int().positive().default(5_000),
    APPOINTMENT_MERGE_COVERAGE_TOLERANCE_MS: z.coerce.number().int().nonnegative().default(10_000),
    APPOINTMENT_MERGE_DISK_MARGIN_BYTES: z.coerce.number().int().positive().default(512 * 1024 * 1024),
    APPOINTMENT_MERGE_URL_EXTRA_SECONDS: z.coerce.number().int().positive().default(1_800),
    APPOINTMENT_MERGE_LOCK_TIMEOUT_MINUTES: z.coerce.number().int().positive().default(20),
    CLIP_MAX_DURATION_MS: z.coerce.number().int().positive().default(30_000),
    CLIP_MIN_DURATION_MS: z.coerce.number().int().positive().default(1_000),
    CLIP_FFMPEG_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
    CLIP_MAX_WAITERS: z.coerce.number().int().positive().default(3),
    CLIP_DISK_MARGIN_BYTES: z.coerce.number().int().positive().default(64 * 1024 * 1024),
    CLIP_COVERAGE_TOLERANCE_MS: z.coerce.number().int().nonnegative().default(10_000),
    COOKIE_SECURE: z.enum(["true", "false"]).default("false"),
    TRUST_PROXY: z.coerce.number().int().min(0).default(1),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")
    throw new Error(`Configuración inválida: ${issues}`)
}

const env = parsed.data

if (env.NODE_ENV === "production") {
    if (env.FRONTEND_ORIGIN.includes("localhost")) {
        throw new Error("FRONTEND_ORIGIN no puede ser localhost en producción")
    }
    if (env.JWT_SECRET.length < 32) {
        throw new Error("JWT_SECRET demasiado corto")
    }
    if (env.MYSQL_DATABASE.includes("undefined")) {
        throw new Error("MYSQL_DATABASE no está definido")
    }
}

export const config = {
    ...env,
    cookieSecure: env.COOKIE_SECURE === "true" || env.NODE_ENV === "production",
    isProduction: env.NODE_ENV === "production",
    isTest: env.NODE_ENV === "test",
    appointmentMergeEnabled: env.APPOINTMENT_MERGE_ENABLED === "true",
}

export const PORT = config.PORT
export const FRONTEND_URL = config.FRONTEND_ORIGIN
export const MYSQL_HOST = config.MYSQL_HOST
export const MYSQL_DATABASE = config.MYSQL_DATABASE
export const MYSQL_USER = config.MYSQL_USER
export const MYSQL_PASSWORD = config.MYSQL_PASSWORD
export const JWT_SECRET = config.JWT_SECRET
export const STABILITY_THRESHOLD = config.STABILITY_THRESHOLD_MS
export const VIDEO_CHUNK_DURATION_MS = config.VIDEO_CHUNK_DURATION_SECONDS * 1000
export const CLOUDINARY_CLOUD_NAME = config.CLOUDINARY_CLOUD_NAME
export const CLOUDINARY_API_KEY = config.CLOUDINARY_API_KEY
export const CLOUDINARY_API_SECRET = config.CLOUDINARY_API_SECRET
