import { NextFunction, Request, Response } from "express"
import { AppError } from "../errors/AppError"
import { logger } from "../logger"
import { config } from "../config/config"

export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction) => {
    next(AppError.notFound("Ruta no encontrada"))
}

export const errorHandler = (error: unknown, req: Request, res: Response, _next: NextFunction) => {
    const appError = error instanceof AppError ? error : null
    const status = appError?.statusCode || 500
    const code = appError?.code || "INTERNAL_ERROR"
    const message = appError?.expose ? appError.message : "Error interno"

    logger.error({
        err: error,
        requestId: req.requestId,
        path: req.path,
        method: req.method,
        status,
        code,
    }, "request_error")

    if (res.headersSent) {
        return
    }

    res.status(status).json({
        code,
        message,
        requestId: req.requestId,
        ...(config.isProduction ? {} : appError ? {} : { debug: "internal" }),
    })
}
