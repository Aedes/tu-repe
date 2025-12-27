import request from "supertest"
import fs from "fs"
import path from "path"

describe("POST Court routes", () => {
    test("POST /courts - debería crear una nueva cancha y el directorio correspondiente", async () => {
        const clubRes = await request("http://localhost:5000")
            .post("/clubs")
            .send({
                name: "Club for Court Creation",
                openTime: "08:00",
                closeTime: "22:00"
            })

        expect(clubRes.status).toBe(201)
        const clubId = clubRes.body.id

        const res = await request("http://localhost:5000")
            .post("/courts")
            .send({
                clubId: clubId,
                name: "New Court",
                rtspUrl: "rtsp://example.com/newcourt"
            })

        expect(res.status).toBe(201)
        expect(res.body).toHaveProperty("id")
        expect(res.body.name).toBe("New Court")
        expect(res.body.rtspUrl).toBe("rtsp://example.com/newcourt")
        expect(res.body.clubId).toBe(clubId)

        const courtId = res.body.id
        const clubPath = path.join("/var/videos", `club_${clubId}`)
        const courtPath = path.join(clubPath, `court_${courtId}`)

        expect(fs.existsSync(clubPath)).toBe(true)
        expect(fs.existsSync(courtPath)).toBe(true)
    })
})