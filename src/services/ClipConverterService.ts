import fs from "fs"
import ffmpeg from "fluent-ffmpeg"

export class ClipConverterService {
    static async convertWebmToMp4(webmPath: string): Promise<string> {
        const outputPath = webmPath.replace(".webm", ".mp4");

        return new Promise((resolve, reject) => {
            ffmpeg(webmPath)
                .outputOptions([
                    "-c:v libx264",
                    "-preset veryfast",
                    "-pix_fmt yuv420p",
                    "-movflags +faststart",
                    "-c:a aac"
                ])
                .save(outputPath)
                .on("end", () => resolve(outputPath))
                .on("error", reject);
        });
    }

    static cleanup(paths: string[]) {
        for (const p of paths) {
            if (fs.existsSync(p)) {
                fs.unlinkSync(p);
            }
        }
    }
}