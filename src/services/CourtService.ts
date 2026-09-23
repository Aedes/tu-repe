import { CourtRepository } from "../repositories"
import { ICourt } from "../types"
import fs from "fs"
import path from "path"
import crypto from "crypto"
import { ClubService } from "./ClubService"
import { config } from "../config/config"
import { AppError } from "../errors/AppError"
import { VideoRepository } from "../repositories/VideoRepository"
import { DeletionJobRepository } from "../repositories/DeletionJobRepository"
import { AppointmentVideoJobRepository } from "../repositories/AppointmentVideoJobRepository"
import { pool } from "../config/db"

export class CourtService {
    private static readonly CourtRepository = new CourtRepository()
    private static readonly videos = new VideoRepository()
    private static readonly deletionJobs = new DeletionJobRepository()
    private static readonly appointmentVideos = new AppointmentVideoJobRepository()

    static async createCourt(court: ICourt): Promise<ICourt> {
        const newCourt = await this.CourtRepository.create(court)
        this.createCourtDirectories(court.clubId, newCourt.id!)
        return newCourt
    }

    private static createCourtDirectories(clubId: number, courtId: number): void {
        const courtPath = path.join(config.VIDEO_DIR, `club_${clubId}`, `court_${courtId}`)
        fs.mkdirSync(courtPath, { recursive: true })
    }

    static findCourtById(id: number): Promise<ICourt | null> {
        return this.CourtRepository.findById(id)
    }

    static findCourtByPublicId(publicId: string): Promise<ICourt | null> {
        return this.CourtRepository.findByPublicId(publicId)
    }

    static findCourtByStreamkey(streamKey: string): Promise<ICourt | null> {
        return this.CourtRepository.findByStreamKey(streamKey)
    }

    static findCourtByNameAndClubId(name: string, clubId: number): Promise<ICourt | null> {
        return this.CourtRepository.findByNameAndClub(name, clubId)
    }

    static getAllCourts(): Promise<ICourt[]> {
        return this.CourtRepository.findAll()
    }

    static getCourtsByClubId(clubId: number): Promise<ICourt[]> {
        return this.CourtRepository.findByClubId(clubId)
    }

    static async getCourtsByClubPublicId(clubPublicId: string): Promise<ICourt[]> {
        const clubId = await ClubService.resolveClubId(clubPublicId)
        return this.CourtRepository.findByClubId(clubId)
    }

    static updateCourt(id: number, newDataCourt: Partial<ICourt>): Promise<ICourt | null> {
        return this.CourtRepository.update(id, newDataCourt)
    }

    static async updateCourtByPublicId(publicId: string, newDataCourt: Partial<ICourt>): Promise<ICourt | null> {
        const court = await this.CourtRepository.findByPublicId(publicId)
        if (!court?.id) return null
        return this.updateCourt(court.id, newDataCourt)
    }

    static async deleteCourt(id: number): Promise<boolean> {
        const court = await this.CourtRepository.findById(id)
        const [rows] = await pool.query(
            `SELECT id, b2_file_path FROM videos WHERE court_id = ? AND status <> 'deleted'`,
            [id]
        )
        for (const row of rows as { id: number; b2_file_path: string }[]) {
            await this.videos.markDeleting(row.id)
            await this.deletionJobs.enqueue({ videoId: row.id, courtId: id, clubId: court?.clubId, b2FilePath: row.b2_file_path })
        }
        const merged = await this.appointmentVideos.findStoredByCourt(id)
        for (const job of merged) {
            if (!job.id || !job.b2FilePath) continue
            await this.appointmentVideos.markDeleting(job.id)
            await this.deletionJobs.enqueue({
                appointmentVideoJobId: job.id,
                courtId: id,
                clubId: court?.clubId,
                b2FilePath: job.b2FilePath,
            })
        }
        const deleted = await this.CourtRepository.delete(id)
        if (deleted && court) {
            this.deleteCourtDirectories(court.clubId, id)
        }
        return deleted
    }

    static async deleteCourtByPublicId(publicId: string): Promise<boolean> {
        const court = await this.CourtRepository.findByPublicId(publicId)
        if (!court?.id) return false
        return this.deleteCourt(court.id)
    }

    static async resolveCourtId(publicId: string): Promise<number> {
        const court = await this.CourtRepository.findByPublicId(publicId)
        if (!court?.id) throw AppError.notFound("Court not found")
        return court.id
    }

    private static deleteCourtDirectories(clubId: number, courtId: number): void {
        const courtPath = path.join(config.VIDEO_DIR, `club_${clubId}`, `court_${courtId}`)
        if (fs.existsSync(courtPath)) {
            fs.rmSync(courtPath, { recursive: true, force: true })
        }
    }

    static generateStreamKey(numberCourt: string): string {
        const randomPart = crypto.randomBytes(18).toString("base64url")
        return `cancha${numberCourt}_${randomPart}`
    }

    static async rotateStreamKey(publicId: string): Promise<ICourt> {
        const court = await this.CourtRepository.findByPublicId(publicId)
        if (!court?.id) throw AppError.notFound("Court not found")
        const streamKey = this.generateStreamKey(String(court.id))
        const cameraPath = `club_${court.clubId}/${streamKey}`
        const updated = await this.updateCourt(court.id, { streamKey, cameraPath })
        if (!updated) throw AppError.notFound("Court not found")
        return updated
    }

    static async verifyStream(streamPath: string, secret: string) {
        if (secret !== config.MEDIA_AUTH_SECRET) {
            throw AppError.unauthorized()
        }
        const parts = streamPath.replace(/^\//, "").split("/")
        const clubPart = parts[0]
        const streamKey = parts[1]
        const clubId = Number(clubPart?.split("_")[1])
        if (!clubId || !streamKey) throw AppError.badRequest("Invalid Stream Key")

        const courtsOfClub = await this.getCourtsByClubId(clubId)
        const court = await this.findCourtByStreamkey(streamKey)
        const isCourtOfClub = court && courtsOfClub.some((item) => item.id === court.id)
        if (!court || !isCourtOfClub) {
            throw AppError.badRequest("Invalid Stream Key")
        }
        return true
    }
}
