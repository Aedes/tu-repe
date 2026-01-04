export const extractMetadataFromFileName = (fileName: string) => {
    const parts = fileName.split("_");
    if (parts.length < 3) return null;

    const courtId = Number(parts[0].replace("cancha", ""));
    const startTime = new Date(parts[1] + " " + parts[2].replace(".mp4", "").replace("-", ":"));
    const endTime = new Date(startTime.getTime() + 600000);

    return { courtId, startTime, endTime };
};