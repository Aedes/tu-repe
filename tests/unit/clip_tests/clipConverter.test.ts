import { ClipConverterService } from "../../../src/services/ClipConverterService";
import { config } from "../../../src/config/config";
import fs from "fs";
import path from "path";

jest.mock("../../../src/utils/ffprobe", () => ({
    probeMedia: jest.fn().mockResolvedValue({
        format: { format_name: "matroska,webm", duration: 10 },
        streams: [{ codec_type: "video", width: 1280, height: 720, avg_frame_rate: "30/1" }],
    }),
    parseDurationSeconds: jest.fn().mockReturnValue(10),
    parseFps: jest.fn().mockReturnValue(30),
}))

jest.mock("child_process", () => ({
    spawn: jest.fn(() => ({
        on: jest.fn((event, callback) => {
            if (event === "exit") queueMicrotask(() => callback(0))
        }),
        kill: jest.fn(),
        killed: false,
    })),
}))

describe("ClipConverterService", () => {
    afterEach(() => {
        jest.restoreAllMocks()
    })

    test("convierte un webm a mp4", async () => {
        const webmPath = "uploads/test.webm";

        const result = await ClipConverterService.convertWebmToMp4(webmPath);

        expect(result).toBe(path.join(config.UPLOAD_DIR, "test.mp4"));
    });

    test("limpia archivos temporales", () => {
        jest.spyOn(fs, "existsSync").mockReturnValue(true);
        const unlinkSpy = jest.spyOn(fs, "unlinkSync").mockImplementation();

        ClipConverterService.cleanup(["a", "b"]);

        expect(unlinkSpy).toHaveBeenCalledTimes(2);
    });

    test("no borra las carpetas de trabajo al limpiar uploads viejos", () => {
        jest.spyOn(fs, "existsSync").mockReturnValue(true);
        jest.spyOn(fs, "readdirSync").mockImplementation(() => ["clips", "viejo.mp4"] as unknown as ReturnType<typeof fs.readdirSync>);
        jest.spyOn(fs, "statSync").mockImplementation((target) => ({
            isDirectory: () => String(target).endsWith(`${path.sep}clips`),
            mtimeMs: 0,
        }) as fs.Stats);
        const unlinkSpy = jest.spyOn(fs, "unlinkSync").mockImplementation();

        ClipConverterService.cleanupOldUploads();

        expect(unlinkSpy).toHaveBeenCalledTimes(1);
        expect(unlinkSpy).toHaveBeenCalledWith(path.join(config.UPLOAD_DIR, "viejo.mp4"));
    });
});
