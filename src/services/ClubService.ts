import { ClubRepository } from "../repositories";
import { ClubWithCourts, IClub, Theme } from "../types";
import { CloudinaryService } from "./CloudinaryService";

export class ClubService {
    private static readonly ClubRepository = new ClubRepository()

    static createClub(club: IClub): Promise<IClub> {
        return this.ClubRepository.create(club)
    }

    static findClubById(id: number): Promise<IClub | null> {
        return this.ClubRepository.findById(id)
    }

    static findClubByPublicId(publicId: string): Promise<IClub | null> {
        return this.ClubRepository.findByPublicId(publicId)
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
        const club = await this.ClubRepository.findById(id);
        if (!club) throw new Error("Club not found")

        const uploadResult = await CloudinaryService.uploadImageAndGetUrl(file.buffer, `tu-repe/images/clubs/${context}s`, `club_${id}_${context}`)
        if (!uploadResult) throw new Error("Error uploading logo")

        if (context === "logo") {
            club.profileImageUrl = uploadResult.url
            club.profileImagePublicId = uploadResult.publicId

            return this.ClubRepository.update(id, { profileImageUrl: club.profileImageUrl, profileImagePublicId: club.profileImagePublicId })
        }

        club.coverImageUrl = uploadResult.url
        club.coverImagePublicId = uploadResult.publicId

        return this.ClubRepository.update(id, { coverImageUrl: club.coverImageUrl, coverImagePublicId: club.coverImagePublicId })
    }

    static async updateClubImageByPublicId(publicId: string, file: Express.Multer.File, context: "logo" | "cover"): Promise<IClub | null> {
        const club = await this.ClubRepository.findByPublicId(publicId);
        if (!club?.id) throw new Error("Club not found")
        return this.updateClubImage(club.id, file, context)
    }

    static async deleteClubImage(id: number, context: "logo" | "cover"): Promise<IClub | null> {
        const club = await this.ClubRepository.findById(id);
        if (!club) throw new Error("Club not found")

        if (context === "logo" && club.profileImagePublicId) {
            await CloudinaryService.deleteImage(club.profileImagePublicId)
            club.profileImageUrl = undefined
            club.profileImagePublicId = undefined

            return this.ClubRepository.update(id, { profileImageUrl: undefined, profileImagePublicId: undefined })
        }

        if (context === "cover" && club.coverImagePublicId) {
            await CloudinaryService.deleteImage(club.coverImagePublicId)
            club.coverImageUrl = undefined
            club.coverImagePublicId = undefined

            return this.ClubRepository.update(id, { coverImageUrl: undefined, coverImagePublicId: undefined })
        }

        return club
    }

    static async deleteClubImageByPublicId(publicId: string, context: "logo" | "cover"): Promise<IClub | null> {
        const club = await this.ClubRepository.findByPublicId(publicId);
        if (!club?.id) throw new Error("Club not found")
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

    static deleteClub(id: number): Promise<boolean> {
        return this.ClubRepository.delete(id)
    }

    static async deleteClubByPublicId(publicId: string): Promise<boolean> {
        const club = await this.ClubRepository.findByPublicId(publicId)
        if (!club?.id) return false
        return this.ClubRepository.delete(club.id)
    }

    static async resolveClubId(publicId: string): Promise<number> {
        const club = await this.ClubRepository.findByPublicId(publicId)
        if (!club?.id) throw new Error("Club not found")
        return club.id
    }
}
