import fs from "fs"
import path from "path"
import { spawn } from "child_process"
import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { Video } from "../../../src/models/Video"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { VideoService } from "../../../src/services/VideoService"
import { B2Service } from "../../../src/services/B2Service"
import { ClipExtractService } from "../../../src/services/ClipExtractService"
import { config } from "../../../src/config/config"
import { parseDurationSeconds, parseFps, probeMedia } from "../../../src/utils/ffprobe"

jest.mock("../../../src/utils/ffprobe", () => ({
    probeMedia: jest.fn(),
    parseDurationSeconds: jest.fn(),
    parseFps: jest.fn(),
}))

jest.mock("child_process", () => ({
    spawn: jest.fn(),
}))

const spawnMock = spawn as unknown as jest.Mock
const probeMock = probeMedia as unknown as jest.Mock
const durationMock = parseDurationSeconds as unknown as jest.Mock
const fpsMock = parseFps as unknown as jest.Mock

const originals = {
    waiters: config.CLIP_MAX_WAITERS,
    timeout: config.CLIP_FFMPEG_TIMEOUT_MS,
    margin: config.CLIP_DISK_MARGIN_BYTES,
    tolerance: config.CLIP_COVERAGE_TOLERANCE_MS,
}

const addPart = (courtId: number, clubId: number, start: Date, minutes: number, name: string, b2FilePath?: string) => {
    return VideoService.createVideo(new Video(
        courtId,
        name,
        start,
        new Date(start.getTime() + minutes * 60 * 1000),
        b2FilePath || `club_${clubId}/court_${courtId}/${name}`
    ))
}

const videoStream = { codec_type: "video", width: 1280, height: 720, avg_frame_rate: "30/1" }
const audioStream = { codec_type: "audio", codec_name: "aac", channels: 2 }

const probeOf = (file: string, sourceHasAudio = false) => ({
    format: { duration: "5" },
    streams: String(file).includes("source-") && !sourceHasAudio ? [videoStream] : [videoStream, audioStream],
})

const installFfmpeg = (hang = false) => {
    spawnMock.mockImplementation((_command: string, args: string[]) => {
        const listeners = new Map<string, (code?: number) => void>()
        const output = args[args.length - 1]
        if (!hang && output?.endsWith(".mp4")) {
            fs.mkdirSync(path.dirname(output), { recursive: true })
            fs.writeFileSync(output, Buffer.from("mp4"))
        }
        const child: {
            killed: boolean
            stderr: { on: jest.Mock }
            kill: jest.Mock
            on: jest.Mock
        } = {
            killed: false,
            stderr: { on: jest.fn() },
            kill: jest.fn(() => {
                child.killed = true
                listeners.get("exit")?.(1)
                return true
            }),
            on: jest.fn((event: string, callback: (code?: number) => void) => {
                listeners.set(event, callback)
                if (!hang && event === "exit") queueMicrotask(() => callback(0))
                return child
            }),
        }
        return child
    })
}

describe("ClipExtractService", () => {
    beforeEach(() => {
        config.CLIP_MAX_WAITERS = originals.waiters
        config.CLIP_FFMPEG_TIMEOUT_MS = originals.timeout
        config.CLIP_DISK_MARGIN_BYTES = 1024
        config.CLIP_COVERAGE_TOLERANCE_MS = 1_000
        installFfmpeg(false)
        spawnMock.mockClear()
        probeMock.mockImplementation(async (file: string) => probeOf(file))
        durationMock.mockReturnValue(5)
        fpsMock.mockReturnValue(30)
        jest.spyOn(B2Service, "getObjectSize").mockResolvedValue(128)
        jest.spyOn(B2Service, "downloadToFile").mockImplementation(async (_key, destination) => {
            await fs.promises.mkdir(path.dirname(destination), { recursive: true })
            await fs.promises.writeFile(destination, "src")
        })
    })

    afterEach(() => {
        config.CLIP_MAX_WAITERS = originals.waiters
        config.CLIP_FFMPEG_TIMEOUT_MS = originals.timeout
        config.CLIP_DISK_MARGIN_BYTES = originals.margin
        config.CLIP_COVERAGE_TOLERANCE_MS = originals.tolerance
        jest.restoreAllMocks()
    })

    const scene = async () => {
        const club = await ClubService.createClub(new Club("Aedes", "08:00", "22:00", 30, "Argentina", "Mendoza", "San Rafael", "Calle 1", "clipextract1"))
        const court = await CourtService.createCourt(new Court(club.id!, "Cancha", "10.0.0.2", "/stream", `key-${club.urlId}`))
        const start = new Date(Date.now() - 40 * 60 * 1000)
        await addPart(court.id!, club.id!, start, 15, "parte-a.mp4")
        await addPart(court.id!, club.id!, new Date(start.getTime() + 15 * 60 * 1000), 15, "parte-b.mp4")
        return { club, court, start }
    }

    test("descarga la key de la base y recorta un solo segmento", async () => {
        const { club, court, start } = await scene()
        const result = await ClipExtractService.extract({
            clubUrlId: club.urlId,
            courtPublicId: court.publicId!,
            appointmentStart: start,
            offsetMs: 5_000,
            durationMs: 8_000,
        })
        expect(B2Service.downloadToFile).toHaveBeenCalledWith(
            `club_${club.id}/court_${court.id}/parte-a.mp4`,
            expect.stringMatching(/source-000\.mp4$/)
        )
        const args = spawnMock.mock.calls[0][1] as string[]
        expect(args.indexOf("-ss")).toBeLessThan(args.indexOf("-i"))
        expect(args).toEqual(expect.arrayContaining([
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-c:v", "libx264",
            "-c:a", "aac",
            "-ar", "48000",
            "-ac", "2",
            "anullsrc=channel_layout=stereo:sample_rate=48000",
        ]))
        expect(args).not.toContain("-an")
        expect(args.join(" ")).not.toContain("concat")
        expect(fs.existsSync(result.outputPath)).toBe(true)
        await result.cleanup()
        await result.cleanup()
        expect(fs.existsSync(result.outputPath)).toBe(false)
    })

    test("concatena varios segmentos sin pedir rutas al cliente", async () => {
        const { club, court, start } = await scene()
        const result = await ClipExtractService.extract({
            clubUrlId: club.urlId,
            courtPublicId: court.publicId!,
            appointmentStart: start,
            offsetMs: 15 * 60 * 1000 - 10_000,
            durationMs: 20_000,
        })
        expect(spawnMock).toHaveBeenCalledTimes(3)
        const concatArgs = spawnMock.mock.calls[2][1] as string[]
        expect(concatArgs).toEqual(expect.arrayContaining(["-f", "concat", "-safe", "0", "-c", "copy"]))
        await result.cleanup()
    })

    test("copia el audio de la fuente y rellena silencio si no hay pista", async () => {
        const { club, court, start } = await scene()
        probeMock.mockImplementation(async (file: string) => probeOf(file, true))
        const withAudio = await ClipExtractService.extract({
            clubUrlId: club.urlId,
            courtPublicId: court.publicId!,
            appointmentStart: start,
            offsetMs: 1_000,
            durationMs: 2_000,
        })
        const audioArgs = spawnMock.mock.calls[0][1] as string[]
        expect(audioArgs).toEqual(expect.arrayContaining(["-map", "0:a:0", "-c:a", "aac", "-ar", "48000", "-ac", "2"]))
        expect(audioArgs.join(" ")).not.toContain("anullsrc")
        await withAudio.cleanup()

        probeMock.mockImplementation(async (file: string) => probeOf(file, false))
        spawnMock.mockClear()
        const silent = await ClipExtractService.extract({
            clubUrlId: club.urlId,
            courtPublicId: court.publicId!,
            appointmentStart: start,
            offsetMs: 4_000,
            durationMs: 2_000,
        })
        const silentArgs = spawnMock.mock.calls[0][1] as string[]
        expect(silentArgs).toContain("anullsrc=channel_layout=stereo:sample_rate=48000")
        expect(silentArgs).toEqual(expect.arrayContaining(["-c:a", "aac", "-ar", "48000", "-ac", "2"]))
        await silent.cleanup()
    })

    test("recorta antes del turno solo dentro de los fragmentos de esa reproducción", async () => {
        const club = await ClubService.createClub(new Club("Pre", "08:00", "22:00", 30, "Argentina", "Mendoza", "San Rafael", "Calle 9", "clipextract9"))
        const court = await CourtService.createCourt(new Court(club.id!, "Cancha", "10.0.0.9", "/stream", `key-${club.urlId}`))
        const appointmentStart = new Date(Math.floor((Date.now() - 25 * 60 * 1000) / 1000) * 1000)
        const fragmentStart = new Date(appointmentStart.getTime() - 10 * 60 * 1000)
        const neighborEnd = new Date(fragmentStart.getTime() - 30_000)
        const neighborStart = new Date(neighborEnd.getTime() - 10 * 60 * 1000)
        await addPart(court.id!, club.id!, neighborStart, 10, "vecino.mp4")
        await addPart(court.id!, club.id!, fragmentStart, 20, "con-anterior.mp4")
        const result = await ClipExtractService.extract({
            clubUrlId: club.urlId,
            courtPublicId: court.publicId!,
            appointmentStart,
            offsetMs: -9 * 60 * 1000,
            durationMs: 5_000,
        })
        expect(B2Service.downloadToFile).toHaveBeenCalledWith(
            `club_${club.id}/court_${court.id}/con-anterior.mp4`,
            expect.stringMatching(/source-000\.mp4$/)
        )
        expect(B2Service.downloadToFile).not.toHaveBeenCalledWith(
            `club_${club.id}/court_${court.id}/vecino.mp4`,
            expect.anything()
        )
        const args = spawnMock.mock.calls[0][1] as string[]
        expect(args).toContain("60.000")
        await result.cleanup()

        const downloads = (B2Service.downloadToFile as jest.Mock).mock.calls.length
        await expect(ClipExtractService.extract({
            clubUrlId: club.urlId,
            courtPublicId: court.publicId!,
            appointmentStart,
            offsetMs: neighborStart.getTime() + 60_000 - appointmentStart.getTime(),
            durationMs: 2_000,
        })).rejects.toMatchObject({ code: "INVALID_CLIP_RANGE" })
        expect(B2Service.downloadToFile).toHaveBeenCalledTimes(downloads)
    })

    test("rechaza cancha de otro club, rango inválido, hueco y key ajena", async () => {
        const { club, court, start } = await scene()
        const other = await ClubService.createClub(new Club("Otro", "08:00", "22:00", 30, "Argentina", "Mendoza", "San Rafael", "Calle 2", "clipextract2"))
        const otherCourt = await CourtService.createCourt(new Court(other.id!, "Cancha", "10.0.0.3", "/stream", "key-other"))
        await expect(ClipExtractService.extract({
            clubUrlId: club.urlId,
            courtPublicId: otherCourt.publicId!,
            appointmentStart: start,
            offsetMs: 0,
            durationMs: 2_000,
        })).rejects.toMatchObject({ code: "NOT_FOUND" })

        await expect(ClipExtractService.extract({
            clubUrlId: club.urlId,
            courtPublicId: court.publicId!,
            appointmentStart: start,
            offsetMs: 30 * 60 * 1000,
            durationMs: 1_000,
        })).rejects.toMatchObject({ code: "INVALID_CLIP_RANGE" })

        const gapped = await ClubService.createClub(new Club("Hueco", "08:00", "22:00", 30, "Argentina", "Mendoza", "San Rafael", "Calle 3", "clipextract3"))
        const gappedCourt = await CourtService.createCourt(new Court(gapped.id!, "Cancha", "10.0.0.4", "/stream", "key-gap"))
        const gapStart = new Date(Date.now() - 50 * 60 * 1000)
        await addPart(gappedCourt.id!, gapped.id!, gapStart, 5, "antes.mp4")
        await addPart(gappedCourt.id!, gapped.id!, new Date(gapStart.getTime() + 20 * 60 * 1000), 10, "despues.mp4")
        await expect(ClipExtractService.extract({
            clubUrlId: gapped.urlId,
            courtPublicId: gappedCourt.publicId!,
            appointmentStart: gapStart,
            offsetMs: 5 * 60 * 1000 - 5_000,
            durationMs: 20_000,
        })).rejects.toMatchObject({ code: "CLIP_COVERAGE_GAP" })

        const unsafe = await ClubService.createClub(new Club("Ruta", "08:00", "22:00", 30, "Argentina", "Mendoza", "San Rafael", "Calle 4", "clipextract4"))
        const unsafeCourt = await CourtService.createCourt(new Court(unsafe.id!, "Cancha", "10.0.0.5", "/stream", "key-unsafe"))
        const unsafeStart = new Date(Date.now() - 35 * 60 * 1000)
        await addPart(unsafeCourt.id!, unsafe.id!, unsafeStart, 30, "mal.mp4", "otro/mal.mp4")
        await expect(ClipExtractService.extract({
            clubUrlId: unsafe.urlId,
            courtPublicId: unsafeCourt.publicId!,
            appointmentStart: unsafeStart,
            offsetMs: 0,
            durationMs: 2_000,
        })).rejects.toMatchObject({ code: "CLIP_PROCESSING_FAILED" })
        expect(B2Service.downloadToFile).not.toHaveBeenCalledWith("otro/mal.mp4", expect.any(String))
    })

    test("limpia el temporal si falla la descarga, el disco o la validación", async () => {
        const { club, court, start } = await scene()
        const dirs = new Set<string>()
        const mkdir = fs.promises.mkdtemp.bind(fs.promises)
        jest.spyOn(fs.promises, "mkdtemp").mockImplementation(async (prefix) => {
            const dir = await mkdir(prefix)
            dirs.add(dir)
            return dir
        })

        jest.spyOn(B2Service, "downloadToFile").mockRejectedValue(new Error("b2"))
        await expect(ClipExtractService.extract({
            clubUrlId: club.urlId,
            courtPublicId: court.publicId!,
            appointmentStart: start,
            offsetMs: 0,
            durationMs: 2_000,
        })).rejects.toMatchObject({ code: "CLIP_PROCESSING_FAILED" })

        jest.spyOn(B2Service, "downloadToFile").mockImplementation(async (_key, destination) => {
            await fs.promises.writeFile(destination, "src")
        })
        jest.spyOn(fs.promises, "statfs").mockResolvedValue({ bavail: 0, bsize: 1 } as unknown as Awaited<ReturnType<typeof fs.promises.statfs>>)
        await expect(ClipExtractService.extract({
            clubUrlId: club.urlId,
            courtPublicId: court.publicId!,
            appointmentStart: start,
            offsetMs: 0,
            durationMs: 2_000,
        })).rejects.toMatchObject({ code: "CLIP_DISK_FULL" })

        jest.spyOn(fs.promises, "statfs").mockRestore()
        durationMock.mockReturnValue(31)
        await expect(ClipExtractService.extract({
            clubUrlId: club.urlId,
            courtPublicId: court.publicId!,
            appointmentStart: start,
            offsetMs: 0,
            durationMs: 2_000,
        })).rejects.toMatchObject({ code: "CLIP_PROCESSING_FAILED" })

        for (const dir of dirs) expect(fs.existsSync(dir)).toBe(false)
    })

    test("corta por timeout y rechaza cuando la cola está llena", async () => {
        const { club, court, start } = await scene()
        config.CLIP_FFMPEG_TIMEOUT_MS = 400
        installFfmpeg(true)
        spawnMock.mockClear()
        await expect(ClipExtractService.extract({
            clubUrlId: club.urlId,
            courtPublicId: court.publicId!,
            appointmentStart: start,
            offsetMs: 0,
            durationMs: 2_000,
        })).rejects.toMatchObject({ code: "CLIP_PROCESSING_TIMEOUT" })
        expect(spawnMock.mock.results[0]?.value.kill).toHaveBeenCalled()

        config.CLIP_FFMPEG_TIMEOUT_MS = originals.timeout
        config.CLIP_MAX_WAITERS = 1
        installFfmpeg(false)
        let release: () => void = () => undefined
        const gate = new Promise<void>((resolve) => {
            release = resolve
        })
        jest.spyOn(B2Service, "downloadToFile").mockImplementation(async (_key, destination) => {
            await gate
            await fs.promises.mkdir(path.dirname(destination), { recursive: true })
            await fs.promises.writeFile(destination, "src")
        })
        const running = ClipExtractService.extract({
            clubUrlId: club.urlId,
            courtPublicId: court.publicId!,
            appointmentStart: start,
            offsetMs: 1_000,
            durationMs: 2_000,
        })
        await new Promise((resolve) => setTimeout(resolve, 500))
        await expect(ClipExtractService.extract({
            clubUrlId: club.urlId,
            courtPublicId: court.publicId!,
            appointmentStart: start,
            offsetMs: 2_000,
            durationMs: 2_000,
        })).rejects.toMatchObject({ code: "CLIP_QUEUE_FULL" })
        release()
        const result = await running
        await result.cleanup()
    })
})
