import fs from "fs";
import path from "path";

export const ensureUploadsDir = () => {
    const uploadPath = path.resolve("uploads");

    if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
    }

    console.log("✅ Carpeta uploads verificada")
};