import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { Video } from "../../../src/models/Video"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { VideoService } from "../../../src/services/VideoService"

describe("eliminar club", () => {
    test("debería eliminar un club correctamente", async () => {
        const club = new Club("Club to Delete", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub = await ClubService.createClub(club)

        const deletionResult = await ClubService.deleteClub(savedClub.id!)

        expect(deletionResult).toBe(true)

        const fetchedClub = await ClubService.findClubById(savedClub.id!)
        expect(fetchedClub).toBeNull()
    })

    test("debería borrar un club y en cascada sus canchas y videos asociados", async () => {
        const club = new Club("Club to Delete", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court to Delete with Club", "192.168.0.1", "/stream1", "encryptedPass1")
        const savedCourt = await CourtService.createCourt(court)

        const video = new Video(savedCourt.id!, "video_to_delete_with_club.mp4", new Date(), new Date(), "http://example.com/video_delete_with_club")
        const savedVideo = await VideoService.createVideo(video)

        const deletionResult = await ClubService.deleteClub(savedClub.id!)

        expect(deletionResult).toBe(true)

        const fetchedClub = await ClubService.findClubById(savedClub.id!)
        expect(fetchedClub).toBeNull()

        const fetchedCourt = await CourtService.findCourtById(savedCourt.id!)
        expect(fetchedCourt).toBeNull()

        const fetchedVideo = await VideoService.findVideoById(savedVideo.id!)
        expect(fetchedVideo).toBeNull()
    })

})