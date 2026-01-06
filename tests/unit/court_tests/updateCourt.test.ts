import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { Video } from "../../../src/models/Video"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { VideoService } from "../../../src/services/VideoService"

describe("eliminar cancha", () => {
    test("debería actualizar una cancha correctamente", async () => {
        const club = new Club("Aedes Padel", "08:00", "22:00", 60)
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Cancha Antigua", "rtsp://example.com/antigua")
        const savedCourt = await CourtService.createCourt(court)

        savedCourt.name = "Cancha Nueva"
        savedCourt.rtspUrl = "rtsp://example.com/nueva"

        const updatedCourt = await CourtService.updateCourt(savedCourt.id!, savedCourt)

        expect(updatedCourt?.name).toBe("Cancha Nueva")
        expect(updatedCourt?.rtspUrl).toBe("rtsp://example.com/nueva")
    })

    test("debería borrar una cancha y en cascada sus videos asociados", async () => {
        const club = new Club("Club to Delete", "08:00", "22:00", 60)
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court to Delete with Club", "rtsp://example.com/delete_with_club")
        const savedCourt = await CourtService.createCourt(court)

        const video = new Video(savedCourt.id!, "video_to_delete_with_club.mp4", new Date(), new Date(), "http://example.com/video_delete_with_club")
        const savedVideo = await VideoService.createVideo(video)

        const deletionResult = await CourtService.deleteCourt(savedCourt.id!)

        expect(deletionResult).toBe(true)

        const fetchedClub = await ClubService.findClubById(savedClub.id!)
        expect(fetchedClub).toBeDefined()

        const fetchedCourt = await CourtService.findCourtById(savedCourt.id!)
        expect(fetchedCourt).toBeNull()

        const fetchedVideo = await VideoService.findVideoById(savedVideo.id!)
        expect(fetchedVideo).toBeNull()
    })
})
