import { B2Service } from "../../../src/services/B2Service"
import request from "supertest"
import path from "path"
import fs from "fs"

test("debería obtener la URL de descarga de un archivo de Backblaze B2 correctamente", async () => {
    const clubRes = await request("http://localhost:5000")
        .post("/clubs")
        .send({
            name: "Club for Upload Test",
            openTime: "08:00",
            closeTime: "22:00"
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

    const b2FilePath = await B2Service.uploadFileAndGetFilePath(videoFilePath, clubId, courtId, videoFileName)

    expect(b2FilePath).toBe(`club_${clubId}/court_${courtId}/${videoFileName}`)

    const b2FileUrl = await B2Service.getDownloadUrl(b2FilePath)

    expect(b2FileUrl).toMatch(/^https:\/\/f[0-9]+\.backblazeb2\.com\/file\/.+\/club_[0-9]+\/court_[0-9]+\/cancha[0-9]+_2024-01-01_10-00\.mp4/)
})