import { Club } from "../../../src/models/Club"
import { Court } from "../../../src/models/Court"
import { Video } from "../../../src/models/Video"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"
import { VideoService } from "../../../src/services/VideoService"

describe("obtener downloadUrl de videos para un partido", () => {
    test("debería obtener los downloadUrl de todos los videos que cubren un partido", async () => {
        const club = new Club("Aedes Padel", "08:00", "22:00", 60)
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court 1", "rtsp://example.com/stream")
        const savedCourt = await CourtService.createCourt(court)

        const appointmentStartTime = new Date("2024-01-01T10:00:00Z")

        const video1Start = new Date("2024-01-01T10:00:00Z")
        const video1End = new Date("2024-01-01T10:15:00Z")
        const video1 = new Video(
            savedCourt.id!,
            "video1.mp4",
            video1Start,
            video1End,
            `club_${savedClub.id}/court_${savedCourt.id}/video1.mp4`
        )

        const video2Start = new Date("2024-01-01T10:15:00Z")
        const video2End = new Date("2024-01-01T10:30:00Z")
        const video2 = new Video(
            savedCourt.id!,
            "video2.mp4",
            video2Start,
            video2End,
            `club_${savedClub.id}/court_${savedCourt.id}/video2.mp4`
        )

        const video3Start = new Date("2024-01-01T10:30:00Z")
        const video3End = new Date("2024-01-01T10:45:00Z")
        const video3 = new Video(
            savedCourt.id!,
            "video3.mp4",
            video3Start,
            video3End,
            `club_${savedClub.id}/court_${savedCourt.id}/video3.mp4`
        )

        const video4Start = new Date("2024-01-01T10:45:00Z")
        const video4End = new Date("2024-01-01T11:00:00Z")
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
            savedCourt.id!
        )

        expect(downloadUrls.length).toBe(4)

        downloadUrls.forEach(url => {
            expect(url).toMatch(/^https:\/\/f[0-9]+\.backblazeb2\.com\/file\/.+/)
        })
    })

    test("debería retornar un array vacío si no hay videos para el rango del partido", async () => {
        const club = new Club("Aedes Padel", "08:00", "22:00", 60)
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court 1", "rtsp://example.com/stream")
        const savedCourt = await CourtService.createCourt(court)

        const appointmentStartTime = new Date("2024-01-01T10:00:00Z")


        const downloadUrls = await VideoService.getVideoDownloadUrlsForAppointment(
            appointmentStartTime,
            savedCourt.id!
        )

        expect(downloadUrls.length).toBe(0)
    })

    test("debería lanzar error si el court no existe", async () => {
        const appointmentStartTime = new Date("2024-01-01T10:00:00Z")
        const nonExistentCourtId = 99999

        await expect(
            VideoService.getVideoDownloadUrlsForAppointment(appointmentStartTime, nonExistentCourtId)
        ).rejects.toThrow("Court not found")
    })

    test("debería calcular correctamente el endTime usando appointmentDuration del club", async () => {
        const club = new Club("Aedes Padel", "08:00", "22:00", 90)
        const savedClub = await ClubService.createClub(club)

        const court = new Court(savedClub.id!, "Court 1", "rtsp://example.com/stream")
        const savedCourt = await CourtService.createCourt(court)

        const appointmentStartTime = new Date("2024-01-01T10:00:00Z")

        const video1 = new Video(
            savedCourt.id!,
            "video1.mp4",
            new Date("2024-01-01T10:00:00Z"),
            new Date("2024-01-01T10:15:00Z"),
            `club_${savedClub.id}/court_${savedCourt.id}/video1.mp4`
        )

        const video6 = new Video(
            savedCourt.id!,
            "video6.mp4",
            new Date("2024-01-01T11:15:00Z"),
            new Date("2024-01-01T11:30:00Z"),
            `club_${savedClub.id}/court_${savedCourt.id}/video6.mp4`
        )

        await VideoService.createVideo(video1)
        await VideoService.createVideo(video6)

        const downloadUrls = await VideoService.getVideoDownloadUrlsForAppointment(
            appointmentStartTime,
            savedCourt.id!
        )

        expect(downloadUrls.length).toBe(2)
    })
})

