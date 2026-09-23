export class AppError extends Error {
    constructor(
        public readonly statusCode: number,
        public readonly code: string,
        message: string,
        public readonly expose = statusCode < 500
    ) {
        super(message)
        this.name = "AppError"
    }

    static badRequest(message = "Solicitud inválida", code = "BAD_REQUEST") {
        return new AppError(400, code, message)
    }

    static unauthorized(message = "No autorizado", code = "UNAUTHORIZED") {
        return new AppError(401, code, message)
    }

    static forbidden(message = "Acceso denegado", code = "FORBIDDEN") {
        return new AppError(403, code, message)
    }

    static notFound(message = "No encontrado", code = "NOT_FOUND") {
        return new AppError(404, code, message)
    }

    static conflict(message = "Conflicto", code = "CONFLICT") {
        return new AppError(409, code, message)
    }

    static tooMany(message = "Demasiadas solicitudes", code = "RATE_LIMITED") {
        return new AppError(429, code, message)
    }

    static unavailable(message = "Servicio no disponible", code = "UNAVAILABLE") {
        return new AppError(503, code, message)
    }
}
