import { VIDEO_CHUNK_DURATION_MS } from "../config/config";

export const extractMetadataFromFileName = (fileName: string) => {
    const parts = fileName.split("_");
    if (parts.length < 3) return null;

    const courtId = Number(parts[0].replace("cancha", ""));
    const dateStr = parts[1];
    const timeStr = parts[2].replace(".mp4", "").replace("-", ":").replace(/-/g, ":");
    const startTime = new Date(`${dateStr}T${timeStr}Z`);
    const endTime = new Date(startTime.getTime() + VIDEO_CHUNK_DURATION_MS);

    return {
        courtId,
        startTime,
        endTime
    };
};