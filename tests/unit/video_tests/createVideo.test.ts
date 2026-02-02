import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { Video } from "../../../src/models/Video"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { VideoService } from "../../../src/services/VideoService"

test("debería persistir un nuevo video en la base de datos", async () => {

    const startTime = new Date("2024-01-01T10:00:00Z")
    const endTime = new Date("2024-01-01T10:10:00Z")

    const club = new Club("Aedes Padel", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
    const savedClub = await ClubService.createClub(club)

    const court = new Court(savedClub.id!, "Court 1", "192.168.0.1", "/stream1", "encryptedPass1")
    const savedCourt = await CourtService.createCourt(court)

    const video = new Video(savedCourt.id!, "video1.mp4", startTime, endTime, "/example/path/video1.mp4")
    const savedVideo = await VideoService.createVideo(video)

    expect(savedVideo.id).toBeDefined()
    expect(savedVideo.courtId).toBe(savedCourt.id)
    expect(savedVideo.fileName).toBe("video1.mp4")
    expect(savedVideo.startTime).toEqual(startTime)
    expect(savedVideo.endTime).toEqual(endTime)
    expect(savedVideo.b2FilePath).toBe("/example/path/video1.mp4")
})