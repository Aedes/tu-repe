import { Request, Response } from "express"
import multer from "multer"
import path from "path"
import { randomUUID } from "crypto"
import fs from "fs"
import FileType from "file-type"
import { config } from "../config/config"
import { AppError } from "../errors/AppError"

fs.mkdirSync(config.UPLOAD_DIR, { recursive: true })

const diskStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, config.UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, "")
        cb(null, `${randomUUID()}${ext || ""}`)
    },
})

const imageFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
        return cb(new AppError(400, "INVALID_FILE", "Formato de imagen inválido"))
    }
    cb(null, true)
}

const webmFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
    if (file.mimetype !== "video/webm") {
        return cb(new AppError(400, "INVALID_FILE", "Formato inválido"))
    }
    cb(null, true)
}

const commonLimits = {
    files: 1,
    fields: 8,
    parts: 10,
    fieldNameSize: 64,
    fieldSize: 8 * 1024,
    headerPairs: 20,
}

export const uploadImages = multer({
    storage: multer.memoryStorage(),
    limits: { ...commonLimits, fileSize: 10 * 1024 * 1024 },
    fileFilter: imageFilter,
})

export const uploadWebm = multer({
    storage: diskStorage,
    limits: { ...commonLimits, fileSize: 12 * 1024 * 1024 },
    fileFilter: webmFilter,
})

export const assertImageMagic = async (buffer: Buffer) => {
    const detected = await FileType.fromBuffer(buffer)
    if (!detected || !["jpg", "png", "webp"].includes(detected.ext)) {
        throw AppError.badRequest("La imagen no es válida")
    }
}

export const handleMulter = (middleware: ReturnType<typeof uploadImages.single>) =>
    (req: Request, res: Response, next: (err?: unknown) => void) => {
        middleware(req, res, (err) => {
            if (!err) return next()
            if (err instanceof multer.MulterError) {
                if (err.code === "LIMIT_FILE_SIZE") {
                    return next(AppError.badRequest("Archivo demasiado grande"))
                }
                return next(AppError.badRequest("Upload inválido"))
            }
            next(err)
        })
    }
