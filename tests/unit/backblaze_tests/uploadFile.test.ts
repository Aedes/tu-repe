import fs from "fs"
import request from "supertest"
import path from "path"
import { VideoService } from "../../../src/services/VideoService"

test("debería subir un video a B2, obtener b2FilePath y eliminar el archivo localmente", async () => {
    const clubRes = await request("http://localhost:5000")
        .post("/clubs")
        .send({
            name: "Club for Upload Test",
            openTime: "08:00",
            closeTime: "22:00",
            appointmentDuration: 60
        })

    expect(clubRes.status).toBe(201)
    const clubId = clubRes.body.id

    const courtRes = await request("http://localhost:5000")
        .post("/courts")
        .send({
            clubId: clubId,
            name: "Court for Upload Test",
            rtspUrl: "rtsp://example.com/uploadtest"
        })

    expect(courtRes.status).toBe(201)
    const courtId = courtRes.body.id

    const videoFileName = `cancha${courtId}_2024-01-01_10-00.mp4`
    const videoFilePath = path.join("/var/videos", `club_${clubId}`, `court_${courtId}`, videoFileName)

    fs.writeFileSync(videoFilePath, "Contenido de prueba para el video.")

    await new Promise((resolve) => setTimeout(resolve, 5000))

    const videos = await VideoService.getVideosByCourtId(courtId)
    const video = videos.find(v => v.fileName === videoFileName)

    expect(video).toBeDefined()
    expect(video!.b2FilePath).toBe(`club_${clubId}/court_${courtId}/${videoFileName}`)

    const fileExists = fs.existsSync(videoFilePath)
    expect(fileExists).toBe(false)
})
