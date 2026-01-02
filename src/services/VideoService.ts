import { CourtRepository, VideoRepository } from "../repositories";
import { IVideo } from "../types";

export class VideoService {
    private static readonly VideoRepository = new VideoRepository()
    private static readonly CourtRepository = new CourtRepository()

    static async createVideo(video: IVideo) {
        const court = await this.CourtRepository.findById(video.courtId)
        if (!court) throw new Error("Court not found")

        const overLappingVideos = await this.VideoRepository.findOverlappingVideos(video.courtId, video.startTime, video.endTime)
        if (overLappingVideos.length > 0) throw new Error("Overlapping videos found for the given court and time range")

        const duplicated = await this.VideoRepository.findByFileNameOrB2FilePath(video.fileName, video.b2FilePath)
        if (duplicated) throw new Error("A video with the same fileName or URL already exists")

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
}