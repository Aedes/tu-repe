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