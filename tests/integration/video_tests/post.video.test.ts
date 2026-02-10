import request from "supertest"
import { generateAdminToken } from "../../helpers/generateToken"
import { PORT } from "../../../src/config/config"
import { CourtService } from "../../../src/services/CourtService"

describe("POST Video routes", () => {
    test("POST /videos - debería crear un nuevo video", async () => {
        const token = generateAdminToken()

        const clubRes = await request(`http://localhost:${PORT}`)
            .post("/clubs")
            .set("Authorization", `Bearer ${token}`)
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

        const courtRes = await request(`http://localhost:${PORT}`)
            .post("/courts")
            .set("Authorization", `Bearer ${token}`)
            .send({
                clubId: clubPublicId,
                name: "New Court",
                cameraHost: "192.168.0.1",
            })

        expect(courtRes.status).toBe(201)
        const courtPublicId = courtRes.body.id

        const court = await CourtService.findCourtByPublicId(courtPublicId)
        const courtId = court?.id

        const res = await request(`http://localhost:${PORT}`)
            .post("/videos")
            .set("Authorization", `Bearer ${token}`)
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
        expect(res.body.courtId).toBe(courtId)
        expect(res.body.b2FilePath).toBe("/example/path/new_video.mp4")
    })
})