import request from "supertest"

describe("POST Video routes", () => {
    test("POST /videos - debería crear un nuevo video", async () => {

        const clubRes = await request("http://localhost:5000")
            .post("/clubs")
            .send({
                name: "Club for Court Creation",
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
                name: "New Court",
                rtspUrl: "rtsp://example.com/newcourt"
            })

        expect(courtRes.status).toBe(201)
        const courtId = courtRes.body.id

        const res = await request("http://localhost:5000")
            .post("/videos")
            .send({
                courtId: courtId,
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