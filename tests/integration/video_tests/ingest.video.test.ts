import request from "supertest"
import fs from "fs"
import path from "path"
import { generateAdminToken } from "../../helpers/generateToken"
import { PORT } from "../../../src/config/config"

describe("debería detectar un video nuevo en el directorio de ingestión y procesarlo correctamente", () => {
    test("Ingestor de video procesa nuevo archivo", async () => {
        const token = generateAdminToken()

        const clubRes = await request(`http://localhost:${PORT}`)
            .post("/clubs")
            .set("Authorization", `Bearer ${token}`)
            .send({
                name: "Club for Video Ingestor",
                openTime: "08:00",
                closeTime: "22:00",
                appointmentDuration: 60,
                country: "Argentina",
                province: "Mendoza",
                city: "San Rafael",
                address: "Comandante Salas 660"
            })

        expect(clubRes.status).toBe(201)
        const clubId = clubRes.body.id

        const courtRes = await request(`http://localhost:${PORT}`)
            .post("/courts")
            .set("Authorization", `Bearer ${token}`)
            .send({
                clubId: clubId,
                name: "Court for Video Ingestor",
                cameraHost: "192.168.0.1",
            })

        expect(courtRes.status).toBe(201)
        const courtId = courtRes.body.id

        const videoFileName = `cancha${courtId}_2024-01-01_10-00.mp4`
        const videoFilePath = path.join("/var/videos", `club_${clubId}`, `court_${courtId}`, videoFileName)

        fs.writeFileSync(videoFilePath, "")

        await new Promise((resolve) => setTimeout(resolve, 10000))

        const videoRes = await request(`http://localhost:${PORT}`)
            .get(`/videos/c/${courtId}`)

        expect(videoRes.status).toBe(200)
        const videos = videoRes.body
        const ingestedVideo = videos.find((v: any) => v.fileName === videoFileName)

        expect(ingestedVideo).toBeDefined()
        expect(ingestedVideo.courtId).toBe(courtId)
        expect(ingestedVideo.b2FilePath).toBe(`club_${clubId}/court_${courtId}/${videoFileName}`)
        expect(new Date(ingestedVideo.startTime).toISOString()).toBe(new Date("2024-01-01T10:00:00.000Z").toISOString())
    })
})