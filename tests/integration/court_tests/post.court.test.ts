import request from "supertest"
import { app } from "../../../src/app"
import fs from "fs"
import path from "path"
import { generateAdminToken } from "../../helpers/generateToken"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { config } from "../../../src/config/config"

describe("POST Court routes", () => {
    test("POST /courts - debería crear una nueva cancha y el directorio correspondiente", async () => {
        const token = await generateAdminToken()

        const clubRes = await request(app)
            .post("/clubs")
            .set("Authorization", `Bearer ${token}`)
            .set("Cookie", "tu_repe_csrf=test-csrf-token")
            .set("X-CSRF-Token", "test-csrf-token")
            .send({
                name: "Club for Court Creation",
                openTime: "08:00",
                closeTime: "22:00",
                appointmentDuration: 60,
                country: "Argentina",
                province: "Mendoza",
                city: "San Rafael",
                address: "Comandante Salas 660"
            })

        expect(clubRes.status).toBe(201)
        const clubPublicId = clubRes.body.id

        const club = await ClubService.findClubByPublicId(clubPublicId)
        const clubId = club?.id

        const res = await request(app)
            .post("/courts")
            .set("Authorization", `Bearer ${token}`)
            .set("Cookie", "tu_repe_csrf=test-csrf-token")
            .set("X-CSRF-Token", "test-csrf-token")
            .send({
                clubId: clubPublicId,
                name: "New Court",
                cameraHost: "192.168.0.1",
            })

        expect(res.status).toBe(201)
        expect(res.body).toHaveProperty("id")
        expect(res.body.name).toBe("New Court")
        expect(res.body.cameraHost).toBe("192.168.0.1")
        expect(res.body.clubId).toBeUndefined()

        const courtPublictId = res.body.id
        const court = await CourtService.findCourtByPublicId(courtPublictId)
        expect(court?.clubId).toBe(clubId)

        const clubPath = path.join(config.VIDEO_DIR, `club_${clubId}`)
        const courtPath = path.join(clubPath, `court_${court?.id}`)

        expect(fs.existsSync(clubPath)).toBe(true)
        expect(fs.existsSync(courtPath)).toBe(true)
    })
})