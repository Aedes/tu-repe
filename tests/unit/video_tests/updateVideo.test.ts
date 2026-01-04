import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { Video } from "../../../src/models/Video"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { VideoService } from "../../../src/services/VideoService"

test("debería actualizar un video correctamente", async () => {
    const club = new Club("Aedes Padel", "08:00", "22:00")
    const savedClub = await ClubService.createClub(club)

    const court = new Court(savedClub.id!, "Court 1", "rtsp://example.com/stream")
    const savedCourt = await CourtService.createCourt(court)

    const startTime = new Date("2024-01-01T10:00:00Z")
    const endTime = new Date("2024-01-01T10:10:00Z")

    const video = new Video(savedCourt.id!, "video1.mp4", startTime, endTime, "/example/path/video")
    const savedVideo = await VideoService.createVideo(video)

    savedVideo.fileName = "video_updated.mp4"
    savedVideo.b2FilePath = "/club_updated/court_updated/video_updated.mp4"

    const updatedVideo = await VideoService.updateVideo(savedVideo.id!, savedVideo)

    expect(updatedVideo?.fileName).toBe("video_updated.mp4")
    expect(updatedVideo?.b2FilePath).toBe("/club_updated/court_updated/video_updated.mp4")
})