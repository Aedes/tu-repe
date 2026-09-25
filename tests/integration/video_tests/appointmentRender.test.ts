import { api, csrfPair } from "../../helpers/generateToken"
import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { Video } from "../../../src/models/Video"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { VideoService } from "../../../src/services/VideoService"
import { pool } from "../../../src/config/db"

describe("POST/GET /videos/render", () => {
    const csrf = csrfPair()

    test("rechaza la creación sin CSRF y valida el cuerpo", async () => {
        const missing = await api().post("/videos/render").send({})
        expect(missing.status).toBe(403)

        const invalid = await api().post("/videos/render").set("Cookie", csrf.cookie).set("X-CSRF-Token", csrf.header).send({ clubUrlId: "short" })
        expect(invalid.status).toBe(400)
    })

    test("encola un partido y permite consultarlo", async () => {
        const club = await ClubService.createClub(new Club("Aedes", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle 1", "renderclub1"))
        const court = await CourtService.createCourt(new Court(club.id!, "Cancha", "10.0.0.3", "/stream", "key"))
        const created = await api()
            .post("/videos/render")
            .set("Cookie", csrf.cookie)
            .set("X-CSRF-Token", csrf.header)
            .send({
                clubUrlId: club.urlId,
                courtId: court.publicId,
                startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                turnstileToken: "test-token",
            })
        expect(created.status).toBe(200)
        expect(created.body.status).toBe("not_found")
        expect(created.headers["cache-control"]).toContain("no-store")

        const missingJob = await api().get("/videos/render/00000000-0000-4000-8000-000000000099")
        expect(missingJob.status).toBe(200)
        expect(missingJob.body.status).toBe("not_found")
    })

    test("la búsqueda pide CAPTCHA y la preparación continúa con el token", async () => {
        const club = await ClubService.createClub(new Club("Aedes", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle 1", "renderchoice"))
        const court = await CourtService.createCourt(new Court(club.id!, "Cancha", "10.0.0.4", "/stream", "key"))
        const start = new Date(Date.now() - 40 * 60 * 1000)
        const first = await VideoService.createVideo(new Video(
            court.id!,
            "a.mp4",
            start,
            new Date(start.getTime() + 30 * 60 * 1000),
            `club_${club.id}/court_${court.id}/a.mp4`
        ))
        const second = await VideoService.createVideo(new Video(
            court.id!,
            "b.mp4",
            new Date(start.getTime() + 30 * 60 * 1000),
            new Date(start.getTime() + 60 * 60 * 1000),
            `club_${club.id}/court_${court.id}/b.mp4`
        ))
        await pool.query(
            `UPDATE videos SET merge_signature = ? WHERE id IN (?, ?)`,
            ["h264|1280|720|yuv420p|aac|2", first.id, second.id]
        )

        const withoutCaptcha = await api()
            .post("/videos/render")
            .set("Cookie", csrf.cookie)
            .set("X-CSRF-Token", csrf.header)
            .send({
                clubUrlId: club.urlId,
                courtId: court.publicId,
                startTime: start.toISOString(),
                mode: "assess",
            })
        expect(withoutCaptcha.status).toBe(400)

        const assessed = await api()
            .post("/videos/render")
            .set("Cookie", csrf.cookie)
            .set("X-CSRF-Token", csrf.header)
            .send({
                clubUrlId: club.urlId,
                courtId: court.publicId,
                startTime: start.toISOString(),
                turnstileToken: "test-token",
                mode: "assess",
            })
        expect(assessed.status).toBe(200)
        expect(assessed.body.status).toBe("choice")

        const queued = await api()
            .post("/videos/render")
            .set("Cookie", csrf.cookie)
            .set("X-CSRF-Token", csrf.header)
            .send({
                clubUrlId: club.urlId,
                courtId: court.publicId,
                startTime: start.toISOString(),
                mode: "unified",
                continuationToken: assessed.body.continuationToken,
            })
        expect(queued.status).toBe(202)
        expect(queued.body.status).toBe("queued")
    })
})
