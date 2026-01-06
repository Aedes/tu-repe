import chokidar from "chokidar"
import path from "path"
import { VideoService } from "../services/VideoService"
import { B2Service } from "../services/B2Service"
import { FailedUploadService } from "../services/FailedUploadService"
import { CourtService } from "../services/CourtService"
import { extractMetadataFromFileName } from "../utils/extractMetadataFromFileName"
import { STABILITY_THRESHOLD } from "../config/config"

export const initVideoIngestor = () => {
    console.log("👀 Ingestor de video iniciado, monitoreando directorio de videos...")

    const WATCH_DIR = "/var/videos/**/**/*.mp4"

    const watcher = chokidar.watch(WATCH_DIR, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: STABILITY_THRESHOLD,
            pollInterval: 1_000
        }
    })

    watcher.on("add", async (filePath) => {
        try {
            console.log("Nuevo video detectado:", filePath)

            const fileName = path.basename(filePath);

            const metadata = extractMetadataFromFileName(fileName);
            if (!metadata) {
                console.error("No se pudo extraer metadata del archivo", fileName);
                return
            }

            const { courtId, startTime, endTime } = metadata;

            const court = await CourtService.findCourtById(courtId);
            if (!court) {
                console.error("Court no encontrado:", courtId);
                return
            }

            let b2FilePath: string;
            try {
                b2FilePath = await B2Service.uploadFileAndGetFilePath(
                    filePath,
                    court.clubId,
                    courtId,
                    fileName
                )
            } catch (uploadError: any) {
                console.error("Error al subir archivo a B2, registrando para reintento:", uploadError.message);
                await FailedUploadService.registerFailedUpload(
                    filePath,
                    fileName,
                    court.clubId,
                    courtId,
                    uploadError.message
                )
                return
            }

            await VideoService.createVideo({
                courtId,
                fileName,
                b2FilePath,
                startTime,
                endTime
            });

            console.log("Video guardado en la BD:", fileName);
        } catch (err: any) {
            console.error("Error al procesar el video:", err);
        }
    })
}

