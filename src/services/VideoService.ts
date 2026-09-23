import { CourtRepository, VideoRepository } from "../repositories"
import { IVideo } from "../types"
import { ClubService } from "./ClubService"
import { B2Service } from "./B2Service"
import { AppError } from "../errors/AppError"
import { config } from "../config/config"
import { pool } from "../config/db"
import { generatePublicId } from "../utils/publicId"
import { DeletionJobRepository } from "../repositories/DeletionJobRepository"
import { PoolConnection } from "mysql2/promise"

export class VideoService {
    private static readonly VideoRepository = new VideoRepository()
    private static readonly CourtRepository = new CourtRepository()
    private static readonly deletionJobs = new DeletionJobRepository()

    static async createVideo(video: IVideo, transactionConnection?: PoolConnection) {
        const court = await this.CourtRepository.findById(video.courtId)
        if (!court) throw AppError.notFound("Court not found")

        const connection = transactionConnection || await pool.getConnection()
        const ownsTransaction = !transactionConnection
        try {
            if (ownsTransaction) await connection.beginTransaction()
            await connection.query("SELECT id FROM courts WHERE id = ? FOR UPDATE", [video.courtId])
            const overlapping = await this.VideoRepository.findOverlappingVideos(
                video.courtId,
                video.startTime,
                video.endTime,
                undefined,
                connection
            )
            if (overlapping.length > 0) {
                throw AppError.conflict("Overlapping videos found for the given court and time range")
            }
            const expiresAt = new Date(video.endTime.getTime() + config.VIDEO_RETENTION_HOURS * 60 * 60 * 1000)
            try {
                const created = await this.VideoRepository.create({
                    ...video,
                    publicId: generatePublicId(),
                    status: "available",
                    expiresAt,
                }, connection)
                if (ownsTransaction) await connection.commit()
                return created
            } catch (error: any) {
                if (String(error.message).includes("Duplicate") || error.code === "ER_DUP_ENTRY") {
                    const existing = await this.VideoRepository.findByFileNameOrB2FilePath(
                        video.fileName,
                        video.b2FilePath,
                        connection
                    )
                    if (ownsTransaction) await connection.commit()
                    if (existing) return existing
                }
                throw error
            }
        } catch (error) {
            if (ownsTransaction) await connection.rollback()
            throw error
        } finally {
            if (ownsTransaction) connection.release()
        }
    }

    static findVideoById(id: number): Promise<IVideo | null> {
        return this.VideoRepository.findById(id)
    }

    static findVideoByPublicId(publicId: string): Promise<IVideo | null> {
        return this.VideoRepository.findByPublicId(publicId)
    }

    static getAllVideos(): Promise<IVideo[]> {
        return this.VideoRepository.findAll()
    }

    static getVideosByCourtId(courtId: number): Promise<IVideo[]> {
        return this.VideoRepository.findByCourtId(courtId)
    }

    static getVideosBetweenDatesAndCourtId(startTime: Date, endTime: Date, courtId: number): Promise<IVideo[]> {
        return this.VideoRepository.findAvailableOverlapping(courtId, startTime, endTime)
    }

    static async getVideosBetweenDates(startTime: Date, endTime: Date, courtId?: number): Promise<IVideo[]> {
        if (courtId) {
            return this.getVideosBetweenDatesAndCourtId(startTime, endTime, courtId)
        }
        const videos = await this.getAllVideos()
        return videos.filter((video) => video.startTime < endTime && video.endTime > startTime)
    }

    static updateVideo(id: number, newDataVideo: Partial<IVideo>): Promise<IVideo | null> {
        return this.VideoRepository.update(id, newDataVideo)
    }

    static async updateVideoByPublicId(publicId: string, newDataVideo: Partial<IVideo>): Promise<IVideo | null> {
        const video = await this.VideoRepository.findByPublicId(publicId)
        if (!video?.id) return null
        if (newDataVideo.startTime || newDataVideo.endTime) {
            const start = newDataVideo.startTime || video.startTime
            const end = newDataVideo.endTime || video.endTime
            const overlapping = await this.VideoRepository.findOverlappingVideos(video.courtId, start, end, video.id)
            if (overlapping.length) throw AppError.conflict("Overlapping videos found")
        }
        return this.updateVideo(video.id, newDataVideo)
    }

    static async deleteVideo(id: number): Promise<boolean> {
        const video = await this.VideoRepository.findById(id)
        if (!video) return false
        await this.VideoRepository.markDeleting(id)
        await this.deletionJobs.enqueue({ videoId: id, courtId: video.courtId, b2FilePath: video.b2FilePath })
        return true
    }

    static async deleteVideoByPublicId(publicId: string): Promise<boolean> {
        const video = await this.VideoRepository.findByPublicId(publicId)
        if (!video?.id) return false
        return this.deleteVideo(video.id)
    }

    static async resolveAppointmentContext(startTime: Date, courtId: number, clubUrlId: string) {
        const court = await this.CourtRepository.findById(courtId)
        if (!court) throw AppError.notFound("Court not found")
        const club = await ClubService.findClubById(court.clubId)
        if (!club || club.urlId !== clubUrlId) throw AppError.notFound("Court not found")

        const now = Date.now()
        const minStart = now - config.VIDEO_RETENTION_HOURS * 60 * 60 * 1000
        const maxStart = now + 5 * 60 * 1000
        if (startTime.getTime() < minStart || startTime.getTime() > maxStart) {
            throw AppError.badRequest("El horario está fuera de la ventana disponible")
        }

        const endTime = new Date(startTime.getTime() + club.appointmentDuration * 60 * 1000)
        return { court, club, endTime }
    }

    static async getVideoDownloadUrlsForAppointment(startTime: Date, courtId: number, clubUrlId: string) {
        const { endTime } = await this.resolveAppointmentContext(startTime, courtId, clubUrlId)
        const videos = await this.VideoRepository.findAvailableOverlapping(courtId, startTime, endTime)
        const urls = await Promise.all(videos.map(async (video) => ({
            startTime: video.startTime,
            endTime: video.endTime,
            url: await B2Service.getDownloadUrl(video.b2FilePath),
        })))
        return urls
    }
}
