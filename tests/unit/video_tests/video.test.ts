import { Video } from "../../../src/models/Video"

test("debería crear una instancia de Video correctamente", () => {

    const startTime = new Date("2024-01-01T10:00:00Z")
    const endTime = new Date("2024-01-01T10:10:00Z")

    const video = new Video(1, "video1.mp4", startTime, endTime, "/example/path/video1.mp4")
    expect(video.courtId).toBe(1)
    expect(video.fileName).toBe("video1.mp4")
    expect(video.startTime).toBe(startTime)
    expect(video.endTime).toBe(endTime)
    expect(video.b2FilePath).toBe("/example/path/video1.mp4")
})