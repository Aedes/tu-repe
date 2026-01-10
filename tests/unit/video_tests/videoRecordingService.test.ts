import { VideoRecordingService } from "../../../src/services/VideoRecordingService";
import { spawn } from "child_process";
import fs from "fs";

jest.mock("child_process", () => ({
    spawn: jest.fn()
}));

jest.mock("fs", () => ({
    existsSync: jest.fn(),
    mkdirSync: jest.fn()
}));

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

describe("VideoRecordingService", () => {
    let mockProcess: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockProcess = {
            stderr: { on: jest.fn() },
            on: jest.fn(),
            kill: jest.fn(),
            killed: false
        };

        mockSpawn.mockReturnValue(mockProcess as any);
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        (fs.mkdirSync as jest.Mock).mockImplementation(() => { });
    });

    afterEach(async () => {
        const activeRecordings = VideoRecordingService.getActiveRecordings();
        for (const courtId of activeRecordings) {
            await VideoRecordingService.stopRecording(courtId);
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
    });

    test("debería iniciar una grabación correctamente", async () => {
        await VideoRecordingService.startRecording(1, 1, "rtsp://example.com/stream");

        expect(fs.mkdirSync).toHaveBeenCalled();
        expect(mockSpawn).toHaveBeenCalledWith("ffmpeg", expect.any(Array));
        expect(VideoRecordingService.isRecording(1)).toBe(true);
    });

    test("debería detener una grabación activa", async () => {
        await VideoRecordingService.startRecording(1, 1, "rtsp://example.com/stream");
        expect(VideoRecordingService.isRecording(1)).toBe(true);

        await VideoRecordingService.stopRecording(1);

        expect(mockProcess.kill).toHaveBeenCalledWith("SIGTERM");
        expect(VideoRecordingService.isRecording(1)).toBe(false);
    });

    test("no debería iniciar una segunda grabación si ya hay una activa", async () => {
        await VideoRecordingService.startRecording(1, 1, "rtsp://example.com/stream");
        const callsBefore = mockSpawn.mock.calls.length;

        await VideoRecordingService.startRecording(1, 1, "rtsp://example.com/stream");

        expect(mockSpawn.mock.calls.length).toBe(callsBefore);
    });
});
