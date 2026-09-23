import { api, csrfPair } from "../../helpers/generateToken"
import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"

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
})
