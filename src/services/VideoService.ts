import { CourtRepository, VideoRepository } from "../repositories";
import { IVideo } from "../types";
import { ClubService } from "./ClubService";
import { B2Service } from "./B2Service";

export class VideoService {
    private static readonly VideoRepository = new VideoRepository()
    private static readonly CourtRepository = new CourtRepository()

    static async createVideo(video: IVideo) {
        const court = await this.CourtRepository.findById(video.courtId)
        if (!court) throw new Error("Court not found")

        const overLappingVideos = await this.VideoRepository.findOverlappingVideos(video.courtId, video.startTime, video.endTime)
        if (overLappingVideos.length > 0) throw new Error("Overlapping videos found for the given court and time range")

        const duplicated = await this.VideoRepository.findByFileNameOrB2FilePath(video.fileName, video.b2FilePath)
        if (duplicated) throw new Error("A video with the same fileName or B2FilePath already exists")

        return this.VideoRepository.create(video)
    }

    static findVideoById(id: number): Promise<IVideo | null> {
        return this.VideoRepository.findById(id)
    }

    static getAllVideos(): Promise<IVideo[]> {
        return this.VideoRepository.findAll()
    }

    static getVideosByCourtId(courtId: number): Promise<IVideo[]> {
        return this.VideoRepository.findByCourtId(courtId)
    }

    static getVideosBetweenDates(startTime: Date, endTime: Date): Promise<IVideo[]> {
        return this.VideoRepository.findByDateRange(startTime, endTime)
    }

    static getVideosBetweenDatesAndCourtId(startTime: Date, endTime: Date, courtId: number): Promise<IVideo[]> {
        return this.VideoRepository.findByDateRangeAndCourtId(startTime, endTime, courtId)
    }

    static updateVideo(id: number, newDataVideo: Partial<IVideo>): Promise<IVideo | null> {
        return this.VideoRepository.update(id, newDataVideo)
    }

    static deleteVideo(id: number): Promise<boolean> {
        return this.VideoRepository.delete(id)
    }

    static async getVideoDownloadUrlsForAppointment(startTime: Date, courtId: number): Promise<string[]> {
        const court = await this.CourtRepository.findById(courtId)
        if (!court) throw new Error("Court not found")

        const club = await ClubService.findClubById(court.clubId)
        if (!club) throw new Error("Club not found")

        const endTime = new Date(startTime.getTime() + club.appointmentDuration * 60 * 1000)

        const videos = await this.getVideosBetweenDatesAndCourtId(startTime, endTime, courtId)

        const downloadUrls = await Promise.all(
            videos.map(video => B2Service.getDownloadUrl(video.b2FilePath))
        )

        return downloadUrls
    }
}