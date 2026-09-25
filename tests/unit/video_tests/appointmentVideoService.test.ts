import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { Video } from "../../../src/models/Video"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { VideoService } from "../../../src/services/VideoService"
import { AppointmentVideoService } from "../../../src/services/AppointmentVideoService"
import { AppointmentVideoConcatService } from "../../../src/services/AppointmentVideoConcatService"
import { B2Service } from "../../../src/services/B2Service"
import { pool } from "../../../src/config/db"
import { AppointmentMergeError } from "../../../src/errors/AppointmentMergeError"

const SIGNATURE = "h264|1280|720|yuv420p|aac|2"

const addPart = async (
    courtId: number,
    clubId: number,
    start: Date,
    minutes: number,
    name: string,
    mergeSignature: string | null = SIGNATURE,
) => {
    const created = await VideoService.createVideo(new Video(
        courtId,
        name,
        start,
        new Date(start.getTime() + minutes * 60 * 1000),
        `club_${clubId}/court_${courtId}/${name}`
    ))
    await pool.query(`UPDATE videos SET merge_signature = ? WHERE id = ?`, [mergeSignature, created.id])
    return created
}

describe("AppointmentVideoService", () => {
    beforeEach(() => {
        jest.spyOn(B2Service, "getDownloadUrl").mockImplementation(async (filePath, expiresIn = 300) => {
            expect(filePath).not.toMatch(/\/var\/videos/)
            return `https://example.test/${filePath}?ttl=${expiresIn}`
        })
        jest.spyOn(B2Service, "objectExists").mockResolvedValue(true)
        jest.spyOn(AppointmentVideoConcatService, "concat").mockResolvedValue({
            b2FilePath: "club_1/court_1/appointments/merged.mp4",
            bytes: 1000,
        })
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    test("un turno completo se encola una sola vez y luego sale de caché", async () => {
        const club = await ClubService.createClub(new Club("Aedes", "08:00", "22:00", 30, "Argentina", "Mendoza", "San Rafael", "Calle 1", "cacheclub1"))
        const court = await CourtService.createCourt(new Court(club.id!, "Cancha", "10.0.0.2", "/stream", "key"))
        const start = new Date(Date.now() - 40 * 60 * 1000)
        await addPart(court.id!, club.id!, start, 15, "parte1.mp4")
        await addPart(court.id!, club.id!, new Date(start.getTime() + 15 * 60 * 1000), 15, "parte2.mp4")

        const first = await AppointmentVideoService.requestRender({ startTime: start, courtPublicId: court.publicId!, clubUrlId: club.urlId, mode: "unified" })
        const second = await AppointmentVideoService.requestRender({ startTime: start, courtPublicId: court.publicId!, clubUrlId: club.urlId, mode: "unified" })
        expect(first.status).toBe("queued")
        expect(second.status).toBe("queued")
        if (first.status === "queued" && second.status === "queued") expect(first.jobId).toBe(second.jobId)
        expect(AppointmentVideoConcatService.concat).not.toHaveBeenCalled()

        await AppointmentVideoService.processNext()
        const ready = await AppointmentVideoService.requestRender({ startTime: start, courtPublicId: court.publicId!, clubUrlId: club.urlId })
        expect(ready.status).toBe("ready")
        if (ready.status === "ready") {
            expect(ready.videoUrl).toContain("appointments/")
            expect(ready.urlExpiresAt).toBeTruthy()
            expect(ready.startTime).toBe(start.toISOString())
            expect(ready.endTime).toBeTruthy()
            expect(JSON.stringify(ready)).not.toMatch(/b2FilePath|\/var\/videos|ffmpeg/i)
        }
        expect(AppointmentVideoConcatService.concat).toHaveBeenCalledTimes(1)
    })

    test("la búsqueda ofrece elegir solo cuando las firmas coinciden", async () => {
        const club = await ClubService.createClub(new Club("Aedes", "08:00", "22:00", 30, "Argentina", "Mendoza", "San Rafael", "Calle 1", "choiceclub1"))
        const court = await CourtService.createCourt(new Court(club.id!, "Cancha", "10.0.0.2", "/stream", "key"))
        const start = new Date(Date.now() - 40 * 60 * 1000)
        await addPart(court.id!, club.id!, start, 15, "choice-1.mp4")
        await addPart(court.id!, club.id!, new Date(start.getTime() + 15 * 60 * 1000), 15, "choice-2.mp4")

        const choice = await AppointmentVideoService.requestRender({ startTime: start, courtPublicId: court.publicId!, clubUrlId: club.urlId, mode: "assess" })
        expect(choice.status).toBe("choice")
        if (choice.status === "choice") {
            expect(choice.parts).toHaveLength(2)
            expect(choice.continuationToken).toEqual(expect.any(String))
        }
        const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM appointment_video_jobs`)
        expect(Number((rows as { total: number }[])[0].total)).toBe(0)
        expect(AppointmentVideoConcatService.concat).not.toHaveBeenCalled()
    })

    test("firmas distintas no ofrecen el video completo", async () => {
        const club = await ClubService.createClub(new Club("Aedes", "08:00", "22:00", 30, "Argentina", "Mendoza", "San Rafael", "Calle 1", "mismatch001"))
        const court = await CourtService.createCourt(new Court(club.id!, "Cancha", "10.0.0.2", "/stream", "key"))
        const start = new Date(Date.now() - 40 * 60 * 1000)
        await addPart(court.id!, club.id!, start, 15, "mix-1.mp4", SIGNATURE)
        await addPart(court.id!, club.id!, new Date(start.getTime() + 15 * 60 * 1000), 15, "mix-2.mp4", "h264|1920|1080|yuv420p|aac|2")

        const assessed = await AppointmentVideoService.requestRender({ startTime: start, courtPublicId: court.publicId!, clubUrlId: club.urlId, mode: "assess" })
        expect(assessed.status).toBe("parts")
        if (assessed.status === "parts") expect(assessed.notice).toBe("incompatible")

        const unified = await AppointmentVideoService.requestRender({ startTime: start, courtPublicId: court.publicId!, clubUrlId: club.urlId, mode: "unified" })
        expect(unified.status).toBe("parts")
        const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM appointment_video_jobs`)
        expect(Number((rows as { total: number }[])[0].total)).toBe(0)
    })

    test("el modo por partes no encola unión", async () => {
        const club = await ClubService.createClub(new Club("Aedes", "08:00", "22:00", 30, "Argentina", "Mendoza", "San Rafael", "Calle 1", "partsclub1"))
        const court = await CourtService.createCourt(new Court(club.id!, "Cancha", "10.0.0.2", "/stream", "key"))
        const start = new Date(Date.now() - 40 * 60 * 1000)
        await addPart(court.id!, club.id!, start, 15, "parte-rapida-1.mp4")
        await addPart(court.id!, club.id!, new Date(start.getTime() + 15 * 60 * 1000), 15, "parte-rapida-2.mp4")

        const result = await AppointmentVideoService.requestRender({
            startTime: start,
            courtPublicId: court.publicId!,
            clubUrlId: club.urlId,
            mode: "parts",
        })

        expect(result.status).toBe("parts")
        if (result.status === "parts") {
            expect(result.parts).toHaveLength(2)
            expect(result.parts[0].url).toContain("parte-rapida-1.mp4")
            expect(result.startTime).toBe(start.toISOString())
            expect(new Date(result.endTime).getTime() - start.getTime()).toBe(30 * 60 * 1000)
        }
        const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM appointment_video_jobs`)
        expect(Number((rows as { total: number }[])[0].total)).toBe(0)
        expect(AppointmentVideoConcatService.concat).not.toHaveBeenCalled()
    })

    test("un hueco reproduce por partes y no crea trabajo", async () => {
        const club = await ClubService.createClub(new Club("Aedes", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle 1", "gapclub001"))
        const court = await CourtService.createCourt(new Court(club.id!, "Cancha", "10.0.0.2", "/stream", "key"))
        const start = new Date(Date.now() - 70 * 60 * 1000)
        await addPart(court.id!, club.id!, start, 15, "solo.mp4")
        const result = await AppointmentVideoService.requestRender({ startTime: start, courtPublicId: court.publicId!, clubUrlId: club.urlId })
        expect(result.status).toBe("parts")
        if (result.status === "parts") {
            expect(result.notice).toBe("gaps")
            expect(result.parts).toHaveLength(1)
            expect(result.startTime).toBe(start.toISOString())
            expect(new Date(result.endTime).getTime() - start.getTime()).toBe(60 * 60 * 1000)
        }
        const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM appointment_video_jobs`)
        expect(Number((rows as { total: number }[])[0].total)).toBe(0)
    })

    test("sin videos responde not_found y un solo fragmento completo no encola", async () => {
        const club = await ClubService.createClub(new Club("Aedes", "08:00", "22:00", 15, "Argentina", "Mendoza", "San Rafael", "Calle 1", "oneclub001"))
        const court = await CourtService.createCourt(new Court(club.id!, "Cancha", "10.0.0.2", "/stream", "key"))
        const start = new Date(Date.now() - 20 * 60 * 1000)
        const empty = await AppointmentVideoService.requestRender({ startTime: start, courtPublicId: court.publicId!, clubUrlId: club.urlId })
        expect(empty.status).toBe("not_found")
        await addPart(court.id!, club.id!, start, 15, "unico.mp4")
        const ready = await AppointmentVideoService.requestRender({ startTime: start, courtPublicId: court.publicId!, clubUrlId: club.urlId })
        expect(ready.status).toBe("ready")
        if (ready.status === "ready") {
            expect(ready.jobId).toBeUndefined()
            expect(ready.startTime).toBe(start.toISOString())
            expect(ready.playbackStartTime).toBeTruthy()
        }
        expect(AppointmentVideoConcatService.concat).not.toHaveBeenCalled()
    })

    test("un fallo definitivo vuelve como partes", async () => {
        const club = await ClubService.createClub(new Club("Aedes", "08:00", "22:00", 30, "Argentina", "Mendoza", "San Rafael", "Calle 1", "failclub01"))
        const court = await CourtService.createCourt(new Court(club.id!, "Cancha", "10.0.0.2", "/stream", "key"))
        const start = new Date(Date.now() - 40 * 60 * 1000)
        await addPart(court.id!, club.id!, start, 15, "a.mp4")
        await addPart(court.id!, club.id!, new Date(start.getTime() + 15 * 60 * 1000), 15, "b.mp4")
        jest.spyOn(AppointmentVideoConcatService, "concat").mockRejectedValue(new AppointmentMergeError("INCOMPATIBLE_SEGMENTS", "no", true))
        const queued = await AppointmentVideoService.requestRender({ startTime: start, courtPublicId: court.publicId!, clubUrlId: club.urlId, mode: "unified" })
        await AppointmentVideoService.processNext()
        if (queued.status !== "queued" && queued.status !== "processing") throw new Error("esperaba trabajo")
        const fallback = await AppointmentVideoService.getRenderStatus(queued.jobId)
        expect(fallback.status).toBe("fallback")
        if (fallback.status === "fallback") {
            expect(fallback.parts.length).toBeGreaterThan(0)
            expect(fallback.startTime).toBeTruthy()
            expect(new Date(fallback.endTime).getTime()).toBeGreaterThan(new Date(fallback.startTime).getTime())
            expect(JSON.stringify(fallback)).not.toMatch(/b2FilePath|\/var\/videos/)
        }
    })

    test("un video vencido no se ofrece", async () => {
        const club = await ClubService.createClub(new Club("Aedes", "08:00", "22:00", 15, "Argentina", "Mendoza", "San Rafael", "Calle 1", "oldclub001"))
        const court = await CourtService.createCourt(new Court(club.id!, "Cancha", "10.0.0.2", "/stream", "key"))
        const start = new Date(Date.now() - 20 * 60 * 1000)
        const created = await addPart(court.id!, club.id!, start, 15, "viejo.mp4")
        await pool.query(`UPDATE videos SET expires_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE) WHERE id = ?`, [created.id])
        const result = await AppointmentVideoService.requestRender({ startTime: start, courtPublicId: court.publicId!, clubUrlId: club.urlId })
        expect(result.status).toBe("not_found")
    })

    test("ready de una fuente usa el inicio real del fragmento", async () => {
        const club = await ClubService.createClub(new Club("Aedes", "08:00", "22:00", 15, "Argentina", "Mendoza", "San Rafael", "Calle 1", "earlyclip01"))
        const court = await CourtService.createCourt(new Court(club.id!, "Cancha", "10.0.0.2", "/stream", "key"))
        const start = new Date(Date.now() - 20 * 60 * 1000)
        const sourceStart = new Date(start.getTime() - 2 * 60 * 1000)
        await addPart(court.id!, club.id!, sourceStart, 17, "previo.mp4")
        const ready = await AppointmentVideoService.requestRender({ startTime: start, courtPublicId: court.publicId!, clubUrlId: club.urlId })
        expect(ready.status).toBe("ready")
        if (ready.status === "ready") {
            expect(ready.startTime).toBe(start.toISOString())
            expect(new Date(ready.playbackStartTime).getTime()).toBeLessThan(start.getTime())
            expect(new Date(ready.endTime).getTime() - start.getTime()).toBe(15 * 60 * 1000)
        }
    })

    test("ready de un merge usa el inicio del primer fragmento", async () => {
        const club = await ClubService.createClub(new Club("Aedes", "08:00", "22:00", 30, "Argentina", "Mendoza", "San Rafael", "Calle 1", "mergestart1"))
        const court = await CourtService.createCourt(new Court(club.id!, "Cancha", "10.0.0.2", "/stream", "key"))
        const start = new Date(Date.now() - 40 * 60 * 1000)
        const firstStart = new Date(start.getTime() - 2 * 60 * 1000)
        await addPart(court.id!, club.id!, firstStart, 17, "primero-previo.mp4")
        await addPart(court.id!, club.id!, new Date(start.getTime() + 15 * 60 * 1000), 15, "segundo-previo.mp4")
        const queued = await AppointmentVideoService.requestRender({ startTime: start, courtPublicId: court.publicId!, clubUrlId: club.urlId, mode: "unified" })
        expect(queued.status).toBe("queued")
        await AppointmentVideoService.processNext()
        const ready = await AppointmentVideoService.requestRender({ startTime: start, courtPublicId: court.publicId!, clubUrlId: club.urlId })
        expect(ready.status).toBe("ready")
        if (ready.status === "ready") {
            expect(ready.startTime).toBe(start.toISOString())
            expect(new Date(ready.playbackStartTime).getTime()).toBeLessThan(start.getTime())
            expect(new Date(ready.playbackStartTime).getTime()).toBeLessThan(new Date(start.getTime() + 15 * 60 * 1000).getTime())
        }
    })
})
