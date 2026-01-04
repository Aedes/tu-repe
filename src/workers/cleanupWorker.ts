import { FailedUploadService } from "../services/FailedUploadService";
import fs from "fs";

const DAYS_TO_KEEP_FAILED = 3;

export const initCleanupWorker = () => {
    const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;

    const processCleanup = async () => {
        try {
            console.log("Iniciando limpieza de archivos fallidos...");

            const oldFailedUploads = await FailedUploadService.getOldPermanentlyFailed(DAYS_TO_KEEP_FAILED);

            let deletedCount = 0;
            let errorCount = 0;

            for (const failedUpload of oldFailedUploads) {
                try {
                    if (fs.existsSync(failedUpload.filePath)) {
                        fs.unlinkSync(failedUpload.filePath);
                        console.log(`Archivo eliminado: ${failedUpload.filePath}`);
                    }

                    await FailedUploadService.deleteFailedUpload(failedUpload.id!);
                    deletedCount++;
                } catch (error: any) {
                    console.error(`Error al limpiar archivo ${failedUpload.filePath}:`, error);
                    errorCount++;
                }
            }

            console.log(`Limpieza completada: ${deletedCount} archivos eliminados, ${errorCount} errores`);
        } catch (error: any) {
            console.error("Error en el worker de limpieza:", error);
        }
    };

    processCleanup();

    setInterval(processCleanup, CLEANUP_INTERVAL);

    console.log("🧹 Worker de limpieza iniciado");
};

