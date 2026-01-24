import dotenv from "dotenv"

delete process.env.MYSQL_DATABASE

dotenv.config({
    path: process.env.NODE_ENV === "test" ? ".env.test" : ".env",
})

export const PORT = Number(process.env.PORT) || 3000;
export const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
export const MYSQL_HOST = process.env.MYSQL_HOST || "localhost";
export const MYSQL_DATABASE = process.env.MYSQL_DATABASE
export const MYSQL_USER = process.env.MYSQL_USER
export const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD
export const DATABASE_URL = `mysql://${MYSQL_USER}:${MYSQL_PASSWORD}@${MYSQL_HOST}/${MYSQL_DATABASE}`;
export const B2_APPLICATION_KEY_ID = process.env.B2_APPLICATION_KEY_ID || "";
export const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY || "";
export const B2_BUCKET_ID = process.env.B2_BUCKET_ID || ""
export const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME || ""
export const STABILITY_THRESHOLD = process.env.STABILITY_THRESHOLD ? Number(process.env.STABILITY_THRESHOLD) : 10_000
export const VIDEO_CHUNK_DURATION_MS = Number(process.env.VIDEO_CHUNK_DURATION_MS) || 60 * 15 * 1000
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
export const JWT_SECRET = process.env.JWT_SECRET
export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || ""
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || ""
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || ""
export const ENCRYPTION_PASSWORD = process.env.ENCRYPTION_PASSWORD || "default_password"