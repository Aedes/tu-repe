import express from "express"
import cors from "cors"
import helmet from "helmet"
import cookieParser from "cookie-parser"
import pinoHttp from "pino-http"
import { config } from "./config/config"
import { logger } from "./logger"
import { clubRouter } from "./routes/club.routes"
import { courtRouter } from "./routes/court.routes"
import { videoRouter } from "./routes/video.routes"
import { clipRouter } from "./routes/clip.routes"
import { authRouter } from "./routes/auth.routes"
import { userRouter } from "./routes/user.routes"
import { attachRequestId, issueCsrfToken, requireCsrf } from "./middlewares/csrf.middleware"
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware"
import { globalLimiter } from "./middlewares/rateLimit.middleware"
import { live, metrics, ready } from "./controllers/health.controller"
import { verifyStream } from "./controllers/court.controller"

export const createApp = () => {
    const app = express()
    app.set("trust proxy", config.TRUST_PROXY)
    app.set("etag", false)
    app.use((_req, res, next) => {
        res.setHeader("Cache-Control", "no-store")
        next()
    })
    app.use(helmet({
        contentSecurityPolicy: false,
        referrerPolicy: { policy: "no-referrer" },
        crossOriginResourcePolicy: { policy: "cross-origin" },
    }))
    app.use(cors({
        origin: config.FRONTEND_ORIGIN,
        credentials: true,
    }))
    app.use(express.json({ limit: "100kb" }))
    app.use(cookieParser())
    app.use(attachRequestId)
    app.use(pinoHttp({
        logger,
        genReqId: (req) => req.requestId || "",
        autoLogging: !config.isTest,
        redact: {
            paths: ["req.headers.authorization", "req.headers.cookie", "req.headers['x-csrf-token']"],
            censor: "[REDACTED]",
        },
    }))
    app.use(issueCsrfToken)

    app.get("/health/live", live)
    app.get("/health/ready", ready)
    app.get("/internal/metrics", metrics)
    app.post("/internal/mediamtx/auth", verifyStream)

    app.use((req, res, next) => {
        if (req.path.startsWith("/internal/") || req.path.startsWith("/health/")) {
            return next()
        }
        if (req.path.startsWith("/auth/") && req.method === "POST" && req.path.endsWith("/login")) {
            return next()
        }
        return requireCsrf(req, res, next)
    })
    app.use(globalLimiter)

    app.use("/clubs", clubRouter)
    app.use("/courts", courtRouter)
    app.use("/videos", videoRouter)
    app.use("/clips", clipRouter)
    app.use("/auth", authRouter)
    app.use("/users", userRouter)

    app.use(notFoundHandler)
    app.use(errorHandler)
    return app
}

export const app = createApp()
