import request from "supertest"
import { app } from "../../../src/app"
import { generateAdminToken } from "../../helpers/generateToken"
import { CourtService } from "../../../src/services/CourtService"
import { VideoService } from "../../../src/services/VideoService"

describe("POST Video routes", () => {
    test("POST /videos - debería crear un nuevo video", async () => {
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

        const courtRes = await request(app)
            .post("/courts")
            .set("Authorization", `Bearer ${token}`)
            .set("Cookie", "tu_repe_csrf=test-csrf-token")
            .set("X-CSRF-Token", "test-csrf-token")
            .send({
                clubId: clubPublicId,
                name: "New Court",
                cameraHost: "192.168.0.1",
            })

        expect(courtRes.status).toBe(201)
        const courtPublicId = courtRes.body.id

        const court = await CourtService.findCourtByPublicId(courtPublicId)
        const courtId = court?.id

        const res = await request(app)
            .post("/videos")
            .set("Authorization", `Bearer ${token}`)
            .set("Cookie", "tu_repe_csrf=test-csrf-token")
            .set("X-CSRF-Token", "test-csrf-token")
            .send({
                courtId: courtPublicId,
                fileName: "new_video.mp4",
                startTime: "2024-01-01T10:00:00Z",
                endTime: "2024-01-01T10:10:00Z",
                b2FilePath: "/example/path/new_video.mp4"
            })

        expect(res.status).toBe(201)
        expect(res.body).toHaveProperty("id")
        expect(res.body.fileName).toBe("new_video.mp4")
        expect(res.body.courtId).toBeUndefined()
        expect(res.body.b2FilePath).toBeUndefined()

        const video = await VideoService.findVideoByPublicId(res.body.id)
        expect(video?.courtId).toBe(courtId)
        expect(video?.b2FilePath).toBe("/example/path/new_video.mp4")
    })
})