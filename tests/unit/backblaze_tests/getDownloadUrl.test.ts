import { B2Service } from "../../../src/services/B2Service"
import request from "supertest"
import path from "path"
import fs from "fs"
import { VideoService } from "../../../src/services/VideoService"
import { generateAdminToken } from "../../helpers/generateToken"

test("debería obtener la URL de descarga de un archivo de Backblaze B2 correctamente", async () => {
    const token = generateAdminToken()

    const clubRes = await request("http://localhost:5000")
        .post("/clubs")
        .set("Authorization", `Bearer ${token}`)
        .send({
            name: "Club for Upload Test",
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

    const courtRes = await request("http://localhost:5000")
        .post("/courts")
        .set("Authorization", `Bearer ${token}`)
        .send({
            clubId: clubId,
            name: "Court for Upload Test",
            cameraHost: "192.168.0.1",
            cameraPort: 554,
            cameraPath: "/stream1",
            rtspUsername: "user1",
            rtspPassword: "cameraPassword123"
        })

    expect(courtRes.status).toBe(201)
    const courtId = courtRes.body.id

    const videoFileName = `cancha${courtId}_2024-01-01_10-00.mp4`
    const videoFilePath = path.join("/var/videos", `club_${clubId}`, `court_${courtId}`, videoFileName)

    fs.writeFileSync(videoFilePath, "Contenido de prueba para el video.")

    await new Promise((resolve) => setTimeout(resolve, 10000))

    const videos = await VideoService.getVideosByCourtId(courtId)
    const video = videos.find(v => v.fileName === videoFileName)

    expect(video).toBeDefined()

    const b2FileUrl = await B2Service.getDownloadUrl(video!.b2FilePath)

    expect(b2FileUrl).toMatch(/^https:\/\/f[0-9]+\.backblazeb2\.com\/file\/.+\/club_[0-9]+\/court_[0-9]+\/cancha[0-9]+_2024-01-01_10-00\.mp4/)
})