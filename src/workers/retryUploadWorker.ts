import { FailedUploadService } from "../services/FailedUploadService";
import { B2Service } from "../services/B2Service";
import { VideoService } from "../services/VideoService";
import fs from "fs";
import { extractMetadataFromFileName } from "../utils/extractMetadataFromFileName";
import { IFailedUpload } from "../types";

const MAX_ATTEMPTS = 10;
const RETRY_INTERVALS = [
    1 * 60 * 1000,
    5 * 60 * 1000,
    15 * 60 * 1000,
    60 * 60 * 1000,
    6 * 60 * 60 * 1000,
    24 * 60 * 60 * 1000
];

const getRetryDelay = (attemptsCount: number): number => {
    if (attemptsCount < RETRY_INTERVALS.length) {
        return RETRY_INTERVALS[attemptsCount];
    }
    return RETRY_INTERVALS[RETRY_INTERVALS.length - 1];
};

const shouldRetry = (failedUpload: IFailedUpload): boolean => {
    const now = new Date();
    const lastAttempt = failedUpload.lastAttemptAt ? new Date(failedUpload.lastAttemptAt) : new Date(failedUpload.createdAt!);
    const timeSinceLastAttempt = now.getTime() - lastAttempt.getTime();
    const requiredDelay = getRetryDelay(failedUpload.attemptsCount);

    return timeSinceLastAttempt >= requiredDelay;
};

export const initRetryUploadWorker = () => {
    const RETRY_INTERVAL = 5 * 60 * 1000;

    const processRetries = async () => {
        try {
            const pendingUploads = await FailedUploadService.getPendingAndRetrying();

            for (const failedUpload of pendingUploads) {
                try {
                    if (!shouldRetry(failedUpload)) {
                        continue;
                    }

                    if (!fs.existsSync(failedUpload.filePath)) {
                        console.log(`Archivo no encontrado, eliminando registro: ${failedUpload.filePath}`);
                        await FailedUploadService.deleteFailedUpload(failedUpload.id!);
                        continue;
                    }

                    if (failedUpload.attemptsCount >= MAX_ATTEMPTS) {
                        console.log(`Máximo de intentos alcanzado para: ${failedUpload.filePath}`);
                        await FailedUploadService.markAsPermanentlyFailed(failedUpload.id!);
                        continue;
                    }

                    console.log(`Reintentando subida: ${failedUpload.filePath} (intento ${failedUpload.attemptsCount + 1})`);

                    let b2FilePath: string;
                    try {
                        b2FilePath = await B2Service.uploadFileAndGetFilePath(
                            failedUpload.filePath,
                            failedUpload.clubId,
                            failedUpload.courtId,
                            failedUpload.fileName
                        );
                    } catch (uploadError: any) {
                        await FailedUploadService.incrementAttempts(
                            failedUpload.id!,
                            uploadError.message
                        );
                        console.error(`Error en reintento ${failedUpload.attemptsCount + 1}: ${uploadError.message}`);
                        continue;
                    }

                    const metadata = extractMetadataFromFileName(failedUpload.fileName);
                    if (!metadata) {
                        throw new Error("No se pudo extraer metadata del nombre del archivo");
                    }

                    await VideoService.createVideo({
                        courtId: failedUpload.courtId,
                        fileName: failedUpload.fileName,
                        b2FilePath,
                        startTime: metadata.startTime,
                        endTime: failedUpload.endTime
                    });

                    await FailedUploadService.deleteFailedUpload(failedUpload.id!);
                    console.log(`Reintento exitoso, video creado: ${failedUpload.fileName}`);

                } catch (error: any) {
                    console.error(`Error procesando reintento para ${failedUpload.filePath}:`, error);
                    await FailedUploadService.incrementAttempts(
                        failedUpload.id!,
                        error.message
                    );
                }
            }
        } catch (error: any) {
            console.error("Error en el worker de reintento:", error);
        }
    };

    processRetries();

    setInterval(processRetries, RETRY_INTERVAL);

    console.log("🔁 Worker de reintento de subidas iniciado");
};