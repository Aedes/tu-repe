import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { Video } from "../../../src/models/Video"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { VideoService } from "../../../src/services/VideoService"
import { B2Service } from "../../../src/services/B2Service"

describe("obtener downloadUrl de videos para un partido", () => {
    beforeEach(() => {
        jest.spyOn(B2Service, "getDownloadUrl").mockImplementation(async (filePath) => `https://example.test/${filePath}`)
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    test("debería obtener los downloadUrl de todos los videos que cubren un partido", async () => {
        const club = new Club("Aedes Padel", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123", "urlId")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court 1", "192.168.0.1", "/stream1", "encryptedPass1")
        const savedCourt = await CourtService.createCourt(court)

        const appointmentStartTime = new Date(Date.now() - 60 * 60 * 1000)

        const video1Start = appointmentStartTime
        const video1End = new Date(appointmentStartTime.getTime() + 15 * 60 * 1000)
        const video1 = new Video(
            savedCourt.id!,
            "video1.mp4",
            video1Start,
            video1End,
            `club_${savedClub.id}/court_${savedCourt.id}/video1.mp4`
        )

        const video2Start = video1End
        const video2End = new Date(appointmentStartTime.getTime() + 30 * 60 * 1000)
        const video2 = new Video(
            savedCourt.id!,
            "video2.mp4",
            video2Start,
            video2End,
            `club_${savedClub.id}/court_${savedCourt.id}/video2.mp4`
        )

        const video3Start = video2End
        const video3End = new Date(appointmentStartTime.getTime() + 45 * 60 * 1000)
        const video3 = new Video(
            savedCourt.id!,
            "video3.mp4",
            video3Start,
            video3End,
            `club_${savedClub.id}/court_${savedCourt.id}/video3.mp4`
        )

        const video4Start = video3End
        const video4End = new Date(appointmentStartTime.getTime() + 60 * 60 * 1000)
        const video4 = new Video(
            savedCourt.id!,
            "video4.mp4",
            video4Start,
            video4End,
            `club_${savedClub.id}/court_${savedCourt.id}/video4.mp4`
        )

        await VideoService.createVideo(video1)
        await VideoService.createVideo(video2)
        await VideoService.createVideo(video3)
        await VideoService.createVideo(video4)

        const downloadUrls = await VideoService.getVideoDownloadUrlsForAppointment(
            appointmentStartTime,
            savedCourt.id!,
            savedClub.urlId
        )

        expect(downloadUrls.length).toBe(4)

        downloadUrls.forEach(({ url }) => {
            expect(url).toMatch(/^https:\/\/example\.test\/club_/)
        })
    })

    test("debería retornar un array vacío si no hay videos para el rango del partido", async () => {
        const club = new Club("Aedes Padel", "08:00", "22:00", 60, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123", "urlId")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court 1", "192.168.0.1", "/stream1", "encryptedPass1")
        const savedCourt = await CourtService.createCourt(court)

        const appointmentStartTime = new Date(Date.now() - 60 * 60 * 1000)


        const downloadUrls = await VideoService.getVideoDownloadUrlsForAppointment(
            appointmentStartTime,
            savedCourt.id!,
            savedClub.urlId
        )

        expect(downloadUrls.length).toBe(0)
    })

    test("debería lanzar error si el court no existe", async () => {
        const appointmentStartTime = new Date(Date.now() - 60 * 60 * 1000)
        const nonExistentCourtId = 99999

        await expect(
            VideoService.getVideoDownloadUrlsForAppointment(appointmentStartTime, nonExistentCourtId, "missingclub")
        ).rejects.toThrow("Court not found")
    })

    test("debería calcular correctamente el endTime usando appointmentDuration del club", async () => {
        const club = new Club("Aedes Padel", "08:00", "22:00", 90, "Argentina", "Mendoza", "San Rafael", "Calle Falsa 123", "urlId")
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court 1", "192.168.0.1", "/stream1", "encryptedPass1")
        const savedCourt = await CourtService.createCourt(court)

        const appointmentStartTime = new Date(Date.now() - 60 * 60 * 1000)

        const video1 = new Video(
            savedCourt.id!,
            "video1.mp4",
            appointmentStartTime,
            new Date(appointmentStartTime.getTime() + 15 * 60 * 1000),
            `club_${savedClub.id}/court_${savedCourt.id}/video1.mp4`
        )

        const video6 = new Video(
            savedCourt.id!,
            "video6.mp4",
            new Date(appointmentStartTime.getTime() + 75 * 60 * 1000),
            new Date(appointmentStartTime.getTime() + 90 * 60 * 1000),
            `club_${savedClub.id}/court_${savedCourt.id}/video6.mp4`
        )

        await VideoService.createVideo(video1)
        await VideoService.createVideo(video6)

        const downloadUrls = await VideoService.getVideoDownloadUrlsForAppointment(
            appointmentStartTime,
            savedCourt.id!,
            savedClub.urlId
        )

        expect(downloadUrls.length).toBe(2)
    })
})

