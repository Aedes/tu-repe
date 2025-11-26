import { VideoRepository } from "../repositories";
import { IVideo } from "../types";

export class VideoService {
    private static readonly VideoRepository = new VideoRepository()

    static createVideo(video: IVideo) {
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