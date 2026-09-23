import { ClubRepository } from "../repositories"
import { ClubWithCourts, IClub, Theme } from "../types"
import { CloudinaryService } from "./CloudinaryService"
import { assertImageMagic } from "../middlewares/upload.middleware"
import { AppError } from "../errors/AppError"
import { DeletionJobRepository } from "../repositories/DeletionJobRepository"
import { AppointmentVideoJobRepository } from "../repositories/AppointmentVideoJobRepository"
import { VideoRepository } from "../repositories/VideoRepository"
import { pool } from "../config/db"

export class ClubService {
    private static readonly ClubRepository = new ClubRepository()
    private static readonly deletionJobs = new DeletionJobRepository()
    private static readonly appointmentVideos = new AppointmentVideoJobRepository()
    private static readonly videos = new VideoRepository()

    static createClub(club: IClub): Promise<IClub> {
        return this.ClubRepository.create(club)
    }

    static findClubById(id: number): Promise<IClub | null> {
        return this.ClubRepository.findById(id)
    }

    static findClubByPublicId(publicId: string): Promise<IClub | null> {
        return this.ClubRepository.findByPublicId(publicId)
    }

    static findClubByUrlId(urlId: string): Promise<IClub | null> {
        return this.ClubRepository.findOneBy({ urlId })
    }

    static findClubByName(name: string): Promise<IClub | null> {
        return this.ClubRepository.findByName(name)
    }

    static getAllClubs(): Promise<IClub[]> {
        return this.ClubRepository.findAll()
    }

    static getAllClubsWithCourts(): Promise<ClubWithCourts[]> {
        return this.ClubRepository.findAllWithCourts()
    }

    static updateClub(id: number, newDataClub: Partial<IClub>): Promise<IClub | null> {
        return this.ClubRepository.update(id, newDataClub)
    }

    static async updateClubByPublicId(publicId: string, newDataClub: Partial<IClub>): Promise<IClub | null> {
        const club = await this.ClubRepository.findByPublicId(publicId)
        if (!club?.id) return null
        return this.ClubRepository.update(club.id, newDataClub)
    }

    static async updateClubImage(id: number, file: Express.Multer.File, context: "logo" | "cover"): Promise<IClub | null> {
        const club = await this.ClubRepository.findById(id)
        if (!club) throw AppError.notFound("Club not found")
        await assertImageMagic(file.buffer)

        const previousId = context === "logo" ? club.profileImagePublicId : club.coverImagePublicId
        const uploadResult = await CloudinaryService.uploadImageAndGetUrl(file.buffer, `tu-repe/images/clubs/${context}s`, `club_${id}_${context}`)

        const patch = context === "logo"
            ? { profileImageUrl: uploadResult.url, profileImagePublicId: uploadResult.publicId }
            : { coverImageUrl: uploadResult.url, coverImagePublicId: uploadResult.publicId }

        const updated = await this.ClubRepository.update(id, patch)
        if (previousId && previousId !== uploadResult.publicId) {
            await CloudinaryService.deleteImage(previousId)
        }
        return updated
    }

    static async updateClubImageByPublicId(publicId: string, file: Express.Multer.File, context: "logo" | "cover"): Promise<IClub | null> {
        const club = await this.ClubRepository.findByPublicId(publicId)
        if (!club?.id) throw AppError.notFound("Club not found")
        return this.updateClubImage(club.id, file, context)
    }

    static async deleteClubImage(id: number, context: "logo" | "cover"): Promise<IClub | null> {
        const club = await this.ClubRepository.findById(id)
        if (!club) throw AppError.notFound("Club not found")

        if (context === "logo" && club.profileImagePublicId) {
            await CloudinaryService.deleteImage(club.profileImagePublicId)
            return this.ClubRepository.update(id, { profileImageUrl: null, profileImagePublicId: null })
        }
        if (context === "cover" && club.coverImagePublicId) {
            await CloudinaryService.deleteImage(club.coverImagePublicId)
            return this.ClubRepository.update(id, { coverImageUrl: null, coverImagePublicId: null })
        }
        return club
    }

    static async deleteClubImageByPublicId(publicId: string, context: "logo" | "cover"): Promise<IClub | null> {
        const club = await this.ClubRepository.findByPublicId(publicId)
        if (!club?.id) throw AppError.notFound("Club not found")
        return this.deleteClubImage(club.id, context)
    }

    static updateClubTheme(id: number, theme: Theme): Promise<Theme | null> {
        return this.ClubRepository.updateTheme(id, theme)
    }

    static async updateClubThemeByPublicId(publicId: string, theme: Theme): Promise<Theme | null> {
        const club = await this.ClubRepository.findByPublicId(publicId)
        if (!club?.id) return null
        return this.updateClubTheme(club.id, theme)
    }

    static async deleteClub(id: number): Promise<boolean> {
        const [rows] = await pool.query(
            `SELECT v.id, v.b2_file_path, v.court_id FROM videos v
             JOIN courts c ON c.id = v.court_id
             WHERE c.club_id = ? AND v.status <> 'deleted'`,
            [id]
        )
        for (const row of rows as { id: number; b2_file_path: string; court_id: number }[]) {
            await this.videos.markDeleting(row.id)
            await this.deletionJobs.enqueue({ videoId: row.id, courtId: row.court_id, clubId: id, b2FilePath: row.b2_file_path })
        }
        const merged = await this.appointmentVideos.findStoredByClub(id)
        for (const job of merged) {
            if (!job.id || !job.b2FilePath) continue
            await this.appointmentVideos.markDeleting(job.id)
            await this.deletionJobs.enqueue({
                appointmentVideoJobId: job.id,
                courtId: job.courtId,
                clubId: id,
                b2FilePath: job.b2FilePath,
            })
        }
        return this.ClubRepository.delete(id)
    }

    static async deleteClubByPublicId(publicId: string): Promise<boolean> {
        const club = await this.ClubRepository.findByPublicId(publicId)
        if (!club?.id) return false
        return this.deleteClub(club.id)
    }

    static async resolveClubId(publicId: string): Promise<number> {
        const club = await this.ClubRepository.findByPublicId(publicId)
        if (!club?.id) throw AppError.notFound("Club not found")
        return club.id
    }
}
