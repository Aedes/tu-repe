import { Request, Response } from "express";
import { ClipConverterService } from "../services/ClipConverterService";

export const convertToMp4 = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Archivo no enviado" });
        }

        const webmPath = req.file.path;
        const mp4Path = await ClipConverterService.convertWebmToMp4(webmPath);

        res.download(mp4Path, "clip-tu-repe.mp4", err => {
            ClipConverterService.cleanup([webmPath, mp4Path]);
            if (err) {
                console.error(err)
                throw new Error("Error al convertir el clip")
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al convertir clip" });
    }
}