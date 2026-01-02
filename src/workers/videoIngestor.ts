import chokidar from "chokidar"
import path from "path"
import { VideoService } from "../services/VideoService"

export const initVideoIngestor = () => {
    const WATCH_DIR = "/var/videos/**/**/*.mp4"

    const watcher = chokidar.watch(WATCH_DIR, {
        persistent: true,
        ignoreInitial: true
    })

    watcher.on("add", async (filePath) => {
        try {
            console.log("Nuevo video detectado:", filePath);

            const fileName = path.basename(filePath);

            const metadata = extractMetadataFromFileName(fileName);
            if (!metadata) {
                console.error("No se pudo extraer metadata del archivo", fileName);
                return;
            }

            const { courtId, startTime, endTime } = metadata;

            await VideoService.createVideo({
                courtId,
                fileName,
                b2FilePath: `/example/path/${fileName}`,
                startTime,
                endTime
            });

            console.log("Video guardado en la BD:", fileName);
        } catch (err) {
            console.error("Error al procesar el video:", err);
        }
    })
}

const extractMetadataFromFileName = (fileName: string) => {
    const parts = fileName.split("_");
    if (parts.length < 3) return null;

    const courtId = Number(parts[0].replace("cancha", ""));
    const startTime = new Date(parts[1] + " " + parts[2].replace(".mp4", "").replace("-", ":"));
    const endTime = new Date(startTime.getTime() + 600000);

    return { courtId, startTime, endTime };
};