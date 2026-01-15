import { ClipConverterService } from "../../../src/services/ClipConverterService";
import fs from "fs";

jest.mock("fluent-ffmpeg")

describe("ClipConverterService", () => {
    test("convierte un webm a mp4", async () => {
        const webmPath = "uploads/test.webm";

        const result = await ClipConverterService.convertWebmToMp4(webmPath);

        expect(result).toBe("uploads/test.mp4");
    });

    test("limpia archivos temporales", () => {
        jest.spyOn(fs, "existsSync").mockReturnValue(true);
        const unlinkSpy = jest.spyOn(fs, "unlinkSync").mockImplementation();

        ClipConverterService.cleanup(["a", "b"]);

        expect(unlinkSpy).toHaveBeenCalledTimes(2);
    });
});
