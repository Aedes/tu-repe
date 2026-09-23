import { NextFunction, Request, Response } from "express"
import { ZodType } from "zod"
import { AppError } from "../errors/AppError"

export const validateBody = (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
        throw AppError.badRequest(result.error.issues[0]?.message || "Datos inválidos")
    }
    req.body = result.data
    next()
}

export const validateQuery = (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
        throw AppError.badRequest("Parámetros inválidos")
    }
    Object.assign(req.query, result.data)
    next()
}

export const validateParams = (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params)
    if (!result.success) {
        throw AppError.badRequest("Identificador inválido")
    }
    Object.assign(req.params, result.data)
    next()
}
