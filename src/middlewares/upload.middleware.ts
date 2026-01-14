import multer from "multer";

const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (_req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

export const uploadWebm = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype !== "video/webm") {
            return cb(new Error("Formato inválido"));
        }
        cb(null, true);
    }
});
