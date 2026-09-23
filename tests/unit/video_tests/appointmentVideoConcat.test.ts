import fs from "fs"
import path from "path"
import { EventEmitter } from "events"
import { config } from "../../../src/config/config"
import { AppointmentVideoConcatService } from "../../../src/services/AppointmentVideoConcatService"
import { B2Service } from "../../../src/services/B2Service"
import { probeMedia } from "../../../src/utils/ffprobe"
import { spawn } from "child_process"

jest.mock("child_process", () => {
    const actual = jest.requireActual("child_process")
    return { ...actual, spawn: jest.fn() }
})

jest.mock("../../../src/utils/ffprobe", () => {
    const actual = jest.requireActual("../../../src/utils/ffprobe")
    return { ...actual, probeMedia: jest.fn() }
})

const mockedSpawn = spawn as jest.Mock
const mockedProbe = probeMedia as jest.Mock

const probeFor = (duration: number, width = 1280) => ({
    format: { duration: String(duration) },
    streams: [{
        codec_type: "video",
        codec_name: "h264",
        width,
        height: 720,
        pix_fmt: "yuv420p",
    }],
})

const fakeProcess = (cwd: string, code = 0, exit = true) => {
    const child = new EventEmitter() as EventEmitter & { stderr: EventEmitter; kill: jest.Mock; killed: boolean }
    child.stderr = new EventEmitter()
    child.killed = false
    child.kill = jest.fn(() => {
        child.killed = true
        return true
    })
    if (exit) {
        fs.writeFileSync(path.join(cwd, "output.mp4"), "video")
        queueMicrotask(() => child.emit("exit", code))
    }
    return child
}

describe("AppointmentVideoConcatService", () => {
    const root = path.join(config.VIDEO_DIR, "appointment-merges")

    beforeEach(() => {
        mockedSpawn.mockClear()
        config.APPOINTMENT_MERGE_DISK_MARGIN_BYTES = 1
        config.APPOINTMENT_MERGE_FFMPEG_TIMEOUT_MS = 300_000
        jest.spyOn(B2Service, "getObjectSize").mockResolvedValue(100)
        jest.spyOn(B2Service, "downloadToFile").mockImplementation(async (_key, destination) => {
            await fs.promises.mkdir(path.dirname(destination), { recursive: true })
            await fs.promises.writeFile(destination, "part")
        })
        jest.spyOn(B2Service, "uploadFile").mockImplementation(async (_local, key) => key)
        mockedProbe.mockImplementation(async (filePath: string) => probeFor(filePath.endsWith("output.mp4") ? 20 : 10))
        mockedSpawn.mockImplementation((_command, _args, options: { cwd: string }) => {
            const list = fs.readFileSync(path.join(options.cwd, "concat.txt"), "utf8")
            expect(list).toBe("file '000.mp4'\nfile '001.mp4'")
            expect(_args).toEqual(expect.arrayContaining(["-f", "concat", "-c", "copy", "-movflags", "+faststart"]))
            return fakeProcess(options.cwd)
        })
    })

    afterEach(() => {
        jest.restoreAllMocks()
        if (fs.existsSync(root)) fs.rmSync(root, { recursive: true, force: true })
    })

    test("descarga en orden, concatena sin recodificar y limpia temporales", async () => {
        const result = await AppointmentVideoConcatService.concat({
            clubId: 4,
            courtId: 8,
            cacheKey: "abc",
            sources: [{ b2FilePath: "a.mp4" }, { b2FilePath: "b.mp4" }],
        })
        expect(result.b2FilePath).toBe("club_4/court_8/appointments/abc.mp4")
        expect(B2Service.downloadToFile).toHaveBeenNthCalledWith(1, "a.mp4", expect.stringMatching(/000\.mp4$/))
        expect(B2Service.downloadToFile).toHaveBeenNthCalledWith(2, "b.mp4", expect.stringMatching(/001\.mp4$/))
        expect(fs.existsSync(root) ? fs.readdirSync(root) : []).toEqual([])
    })

    test("fragmentos incompatibles no inician ffmpeg", async () => {
        mockedProbe.mockImplementation(async (filePath: string) => probeFor(10, filePath.endsWith("001.mp4") ? 1920 : 1280))
        await expect(AppointmentVideoConcatService.concat({
            clubId: 1,
            courtId: 1,
            cacheKey: "abc",
            sources: [{ b2FilePath: "a.mp4" }, { b2FilePath: "b.mp4" }],
        })).rejects.toMatchObject({ code: "INCOMPATIBLE_SEGMENTS", permanent: true })
        expect(mockedSpawn).not.toHaveBeenCalled()
        expect(fs.existsSync(root) ? fs.readdirSync(root) : []).toEqual([])
    })

    test("un fallo de descarga limpia el directorio", async () => {
        jest.spyOn(B2Service, "downloadToFile").mockImplementation(async (_key, destination) => {
            if (destination.endsWith("001.mp4")) throw new Error("corte")
            await fs.promises.writeFile(destination, "part")
        })
        await expect(AppointmentVideoConcatService.concat({
            clubId: 1,
            courtId: 1,
            cacheKey: "abc",
            sources: [{ b2FilePath: "a.mp4" }, { b2FilePath: "b.mp4" }],
        })).rejects.toMatchObject({ code: "B2_DOWNLOAD" })
        expect(fs.existsSync(root) ? fs.readdirSync(root) : []).toEqual([])
    })

    test("timeout y salida distinta de cero también limpian", async () => {
        config.APPOINTMENT_MERGE_FFMPEG_TIMEOUT_MS = 20
        mockedSpawn.mockImplementation((_command, _args, options: { cwd: string }) => fakeProcess(options.cwd, 0, false))
        await expect(AppointmentVideoConcatService.concat({
            clubId: 1,
            courtId: 1,
            cacheKey: "abc",
            sources: [{ b2FilePath: "a.mp4" }],
        })).rejects.toMatchObject({ code: "TIMEOUT" })

        mockedSpawn.mockImplementation((_command, _args, options: { cwd: string }) => fakeProcess(options.cwd, 1))
        await expect(AppointmentVideoConcatService.concat({
            clubId: 1,
            courtId: 1,
            cacheKey: "abc",
            sources: [{ b2FilePath: "a.mp4" }],
        })).rejects.toMatchObject({ code: "FFMPEG_FAILED" })
        expect(fs.existsSync(root) ? fs.readdirSync(root) : []).toEqual([])
    })
})
