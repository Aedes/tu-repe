import request from "supertest"
import fs from "fs"
import path from "path"

describe("debería detectar un video nuevo en el directorio de ingestión y procesarlo correctamente", () => {
    test("Ingestor de video procesa nuevo archivo", async () => {
        const clubRes = await request("http://localhost:5000")
            .post("/clubs")
            .send({
                name: "Club for Video Ingestor",
                openTime: "08:00",
                closeTime: "22:00"
            })

        expect(clubRes.status).toBe(201)
        const clubId = clubRes.body.id

        const courtRes = await request("http://localhost:5000")
            .post("/courts")
            .send({
                clubId: clubId,
                name: "Court for Video Ingestor",
                rtspUrl: "rtsp://example.com/ingestorcourt"
            })

        expect(courtRes.status).toBe(201)
        const courtId = courtRes.body.id

        const videoFileName = `cancha${courtId}_2024-01-01_10-00.mp4`
        const videoFilePath = path.join("/var/videos", `club_${clubId}`, `court_${courtId}`, videoFileName)

        fs.writeFileSync(videoFilePath, "")

        // Esto podría simular la subida de el video a B2 y la obtención de la URL pública. Cuando termine, debería eliminar el archivo del servidor local.
        await new Promise((resolve) => setTimeout(resolve, 3000))

        const videoRes = await request("http://localhost:5000")
            .get(`/videos/c/${courtId}`)

        expect(videoRes.status).toBe(200)
        const videos = videoRes.body
        const ingestedVideo = videos.find((v: any) => v.fileName === videoFileName)

        expect(ingestedVideo).toBeDefined()
        expect(ingestedVideo.courtId).toBe(courtId)
        expect(ingestedVideo.b2FilePath).toBe("/example/path/" + videoFileName)
        expect(new Date(ingestedVideo.startTime).toISOString()).toBe(new Date("2024-01-01T10:00:00.000").toISOString())
        expect(new Date(ingestedVideo.endTime).toISOString()).toBe(new Date("2024-01-01T10:10:00.000").toISOString())
    })
})