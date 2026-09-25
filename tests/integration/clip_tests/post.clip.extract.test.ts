import request from "supertest"
import fs from "fs"
import path from "path"
import { spawn } from "child_process"
import { app } from "../../../src/app"
import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { Video } from "../../../src/models/Video"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { VideoService } from "../../../src/services/VideoService"
import { B2Service } from "../../../src/services/B2Service"
import { TurnstileService } from "../../../src/services/TurnstileService"
import { AppError } from "../../../src/errors/AppError"
import { parseDurationSeconds, parseFps, probeMedia } from "../../../src/utils/ffprobe"

jest.mock("../../../src/utils/ffprobe", () => ({
    probeMedia: jest.fn(async (file: string) => ({
        format: { duration: "5" },
        streams: String(file).includes("source-")
            ? [{ codec_type: "video", width: 1280, height: 720, avg_frame_rate: "30/1" }]
            : [
                { codec_type: "video", width: 1280, height: 720, avg_frame_rate: "30/1" },
                { codec_type: "audio", codec_name: "aac", channels: 2 },
            ],
    })),
    parseDurationSeconds: jest.fn().mockReturnValue(5),
    parseFps: jest.fn().mockReturnValue(30),
}))

jest.mock("child_process", () => ({
    spawn: jest.fn((_command: string, args: string[]) => {
        const output = args[args.length - 1]
        if (output?.endsWith(".mp4")) {
            fs.mkdirSync(path.dirname(output), { recursive: true })
            fs.writeFileSync(output, Buffer.from("mp4"))
        }
        return {
            killed: false,
            stderr: { on: jest.fn() },
            kill: jest.fn(),
            on: jest.fn((event: string, callback: (code?: number) => void) => {
                if (event === "exit") queueMicrotask(() => callback(0))
            }),
        }
    }),
}))

const addPart = (courtId: number, clubId: number, start: Date, minutes: number, name: string) => {
    return VideoService.createVideo(new Video(
        courtId,
        name,
        start,
        new Date(start.getTime() + minutes * 60 * 1000),
        `club_${clubId}/court_${courtId}/${name}`
    ))
}

const csrf = (builder: request.Test) => builder
    .set("Cookie", "tu_repe_csrf=test-csrf-token")
    .set("X-CSRF-Token", "test-csrf-token")

describe("POST /clips/extract", () => {
    beforeEach(() => {
        jest.spyOn(B2Service, "getObjectSize").mockResolvedValue(128)
        jest.spyOn(B2Service, "downloadToFile").mockImplementation(async (_key, destination) => {
            await fs.promises.mkdir(path.dirname(destination), { recursive: true })
            await fs.promises.writeFile(destination, "src")
        })
        ;(probeMedia as unknown as jest.Mock).mockClear()
        ;(parseDurationSeconds as unknown as jest.Mock).mockClear()
        ;(parseFps as unknown as jest.Mock).mockClear()
        ;(spawn as unknown as jest.Mock).mockClear()
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    const scene = async (duration = 30) => {
        const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`.slice(-8)
        const club = await ClubService.createClub(new Club("Aedes", "08:00", "22:00", duration, "Argentina", "Mendoza", "San Rafael", "Calle 1", `h${suffix}`))
        const court = await CourtService.createCourt(new Court(club.id!, "Cancha", "10.0.0.2", "/stream", `key-${club.urlId}`))
        const start = new Date(Date.now() - 40 * 60 * 1000)
        start.setUTCMilliseconds(600)
        await addPart(court.id!, club.id!, start, duration, "completo.mp4")
        return { club, court, start }
    }

    const post = (body: Record<string, unknown>) => csrf(request(app).post("/clips/extract")).send(body)

    test("devuelve un mp4 y exige Turnstile", async () => {
        const verify = jest.spyOn(TurnstileService, "verify")
        const { club, court, start } = await scene()
        const response = await post({
            clubUrlId: club.urlId,
            courtId: court.publicId,
            appointmentStartTime: start.toISOString(),
            offsetMs: 1_000,
            durationMs: 5_000,
            turnstileToken: "token-ok",
        })
        expect(response.status).toBe(200)
        expect(response.headers["content-type"]).toContain("video/mp4")
        expect(response.headers["content-disposition"]).toContain("clip-tu-repe.mp4")
        expect(response.headers["cache-control"]).toContain("no-store")
        expect(verify).toHaveBeenCalledWith("token-ok", expect.anything())
        expect(JSON.stringify(response.body)).not.toMatch(/b2FilePath|https?:\/\//)
    })

    test("acepta los límites de 1 y 30 segundos", async () => {
        const { club, court, start } = await scene()
        for (const durationMs of [1_000, 30_000]) {
            const response = await post({
                clubUrlId: club.urlId,
                courtId: court.publicId,
                appointmentStartTime: start.toISOString(),
                offsetMs: 0,
                durationMs,
                turnstileToken: "token-ok",
            })
            expect(response.status).toBe(200)
        }
    })

    test("rechaza CSRF, cuerpo estricto y duraciones fuera de rango", async () => {
        const { club, court, start } = await scene()
        const csrfResponse = await request(app).post("/clips/extract").send({
            clubUrlId: club.urlId,
            courtId: court.publicId,
            appointmentStartTime: start.toISOString(),
            offsetMs: 0,
            durationMs: 1_000,
            turnstileToken: "token-ok",
        })
        expect(csrfResponse.status).toBe(403)
        expect(csrfResponse.body.code).toBe("FORBIDDEN")

        const extra = await post({
            clubUrlId: club.urlId,
            courtId: court.publicId,
            appointmentStartTime: start.toISOString(),
            offsetMs: 0,
            durationMs: 1_000,
            turnstileToken: "token-ok",
            url: "https://evil.test/video.mp4",
            b2FilePath: "club_1/court_1/secreto.mp4",
        })
        expect(extra.status).toBe(400)
        expect(extra.text).not.toContain("evil.test")
        expect(extra.text).not.toContain("secreto.mp4")
        expect(B2Service.getObjectSize).not.toHaveBeenCalled()

        for (const durationMs of [999, 30_001]) {
            const response = await post({
                clubUrlId: club.urlId,
                courtId: court.publicId,
                appointmentStartTime: start.toISOString(),
                offsetMs: 0,
                durationMs,
                turnstileToken: "token-ok",
            })
            expect(response.status).toBe(400)
        }
    })

    test("rechaza cancha ajena, retención, offset y hueco", async () => {
        const { club, court, start } = await scene()
        const other = await ClubService.createClub(new Club("Otro", "08:00", "22:00", 30, "Argentina", "Mendoza", "San Rafael", "Calle 2", "cliphttpother"))
        const otherCourt = await CourtService.createCourt(new Court(other.id!, "Cancha", "10.0.0.3", "/stream", "key-other"))
        const foreign = await post({
            clubUrlId: club.urlId,
            courtId: otherCourt.publicId,
            appointmentStartTime: start.toISOString(),
            offsetMs: 0,
            durationMs: 1_000,
            turnstileToken: "token-ok",
        })
        expect(foreign.status).toBe(404)

        const expired = await post({
            clubUrlId: club.urlId,
            courtId: court.publicId,
            appointmentStartTime: new Date(Date.now() - 80 * 60 * 60 * 1000).toISOString(),
            offsetMs: 0,
            durationMs: 1_000,
            turnstileToken: "token-ok",
        })
        expect(expired.status).toBe(400)

        const outside = await post({
            clubUrlId: club.urlId,
            courtId: court.publicId,
            appointmentStartTime: start.toISOString(),
            offsetMs: 30 * 60 * 1000,
            durationMs: 1_000,
            turnstileToken: "token-ok",
        })
        expect(outside.status).toBe(400)
        expect(outside.body.code).toBe("INVALID_CLIP_RANGE")

        const earlyClub = await ClubService.createClub(new Club("Antes", "08:00", "22:00", 30, "Argentina", "Mendoza", "San Rafael", "Calle 8", "cliphttpearly"))
        const earlyCourt = await CourtService.createCourt(new Court(earlyClub.id!, "Cancha", "10.0.0.8", "/stream", "key-early"))
        const earlyAppointment = new Date(Date.now() - 30 * 60 * 1000)
        await addPart(earlyCourt.id!, earlyClub.id!, new Date(earlyAppointment.getTime() - 2 * 60 * 1000), 20, "con-anterior.mp4")
        const early = await post({
            clubUrlId: earlyClub.urlId,
            courtId: earlyCourt.publicId,
            appointmentStartTime: earlyAppointment.toISOString(),
            offsetMs: -60_000,
            durationMs: 5_000,
            turnstileToken: "token-ok",
        })
        expect(early.status).toBe(200)
        expect(early.headers["content-type"]).toMatch(/video\/mp4/)
        const tooEarly = await post({
            clubUrlId: earlyClub.urlId,
            courtId: earlyCourt.publicId,
            appointmentStartTime: earlyAppointment.toISOString(),
            offsetMs: -3 * 60 * 1000,
            durationMs: 2_000,
            turnstileToken: "token-ok",
        })
        expect(tooEarly.status).toBe(400)
        expect(tooEarly.body.code).toBe("INVALID_CLIP_RANGE")

        const gappedClub = await ClubService.createClub(new Club("Hueco", "08:00", "22:00", 30, "Argentina", "Mendoza", "San Rafael", "Calle 3", "cliphttpgap01"))
        const gappedCourt = await CourtService.createCourt(new Court(gappedClub.id!, "Cancha", "10.0.0.4", "/stream", "key-gap"))
        const gapStart = new Date(Date.now() - 45 * 60 * 1000)
        await addPart(gappedCourt.id!, gappedClub.id!, gapStart, 5, "antes.mp4")
        await addPart(gappedCourt.id!, gappedClub.id!, new Date(gapStart.getTime() + 20 * 60 * 1000), 10, "despues.mp4")
        const gap = await post({
            clubUrlId: gappedClub.urlId,
            courtId: gappedCourt.publicId,
            appointmentStartTime: gapStart.toISOString(),
            offsetMs: 5 * 60 * 1000 - 5_000,
            durationMs: 20_000,
            turnstileToken: "token-ok",
        })
        expect(gap.status).toBe(422)
        expect(gap.body.code).toBe("CLIP_COVERAGE_GAP")
    })

    test("no descarga si Turnstile falla", async () => {
        jest.spyOn(TurnstileService, "verify").mockRejectedValue(AppError.forbidden("Verificación anti-bot fallida"))
        const { club, court, start } = await scene()
        const response = await post({
            clubUrlId: club.urlId,
            courtId: court.publicId,
            appointmentStartTime: start.toISOString(),
            offsetMs: 0,
            durationMs: 1_000,
            turnstileToken: "token-mal",
        })
        expect(response.status).toBe(403)
        expect(B2Service.downloadToFile).not.toHaveBeenCalled()
    })
})
