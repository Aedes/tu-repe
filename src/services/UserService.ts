import { UserRepository } from "../repositories/UserRepository"
import { IClub, IUser, UserWithClubs } from "../types"
import { ClubService } from "./ClubService"
import { CourtService } from "./CourtService"
import { HashingService } from "./HashingService"
import { AppError } from "../errors/AppError"

export class UserService {
    private static readonly UserRepository = new UserRepository()

    static createUser(user: IUser): Promise<IUser> {
        return this.UserRepository.create(user)
    }

    static findUserById(id: number): Promise<IUser | null> {
        return this.UserRepository.findById(id)
    }

    static findUserByPublicId(publicId: string): Promise<IUser | null> {
        return this.UserRepository.findByPublicId(publicId)
    }

    static findUserByEmail(email: string): Promise<IUser | null> {
        return this.UserRepository.findByEmail(email)
    }

    static getAllUsers(): Promise<IUser[]> {
        return this.UserRepository.findAll()
    }

    static updateUser(id: number, newDataUser: Partial<IUser>): Promise<IUser | null> {
        return this.UserRepository.update(id, newDataUser)
    }

    static async updateUserByPublicId(publicId: string, newDataUser: Partial<IUser>): Promise<IUser | null> {
        const user = await this.UserRepository.findByPublicId(publicId)
        if (!user?.id) return null
        return this.UserRepository.update(user.id, newDataUser)
    }

    static deleteUser(id: number): Promise<boolean> {
        return this.UserRepository.delete(id)
    }

    static async deleteUserByPublicId(publicId: string): Promise<boolean> {
        const user = await this.UserRepository.findByPublicId(publicId)
        if (!user?.id) return false
        await this.UserRepository.incrementTokenVersion(user.id)
        return this.UserRepository.delete(user.id)
    }

    static comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
        return HashingService.comparePassword(plainPassword, hashedPassword)
    }

    static async requireOwnerOfClub(userId: string, clubPublicId: string): Promise<boolean> {
        const club = await ClubService.findClubByPublicId(clubPublicId)
        if (!club?.id) return false
        return this.UserRepository.requireOwnerOfClub(userId, String(club.id))
    }

    static async requireOwnerOfCourt(userId: string, courtPublicId: string): Promise<boolean> {
        const court = await CourtService.findCourtByPublicId(courtPublicId)
        if (!court?.id) return false
        return this.UserRepository.requireOwnerOfCourt(userId, String(court.id))
    }

    static getAllUsersWithClubs(): Promise<UserWithClubs[]> {
        return this.UserRepository.getAllUsersWithClubs()
    }

    static async getUserWithClubs(id: number): Promise<UserWithClubs> {
        const usersWithClubs = await this.getAllUsersWithClubs()
        const user = usersWithClubs.find((item) => item.id === id)
        const allClubs = await ClubService.getAllClubsWithCourts()
        if (user && Array.isArray(user.clubs)) {
            user.clubs = allClubs
                .filter((club) => user.clubs.some((userClub) => userClub.id === club.id))
                .map((club) => ({
                    ...club,
                    courts: Array.isArray(club.courts)
                        ? club.courts.map((court) => ({
                            id: court.id,
                            publicId: court.publicId,
                            name: court.name,
                            clubId: court.clubId,
                            cameraHost: "",
                            cameraPath: "",
                            streamKey: "",
                        }))
                        : [],
                }))
        }
        if (!user) throw AppError.notFound("Error obteniendo usuario")
        return user
    }

    static async assignOwnerToClub(userId: number, clubId: number): Promise<IClub> {
        const assigned = await this.UserRepository.assingOwnerToClub(userId, clubId)
        if (!assigned) throw AppError.badRequest("Error asignando dueño")
        const clubAssigned = await ClubService.findClubById(clubId)
        if (!clubAssigned) throw AppError.badRequest("Error asignando dueño")
        return clubAssigned
    }

    static async unassingOwner(userId: number, clubId: number): Promise<IClub> {
        const unassigned = await this.UserRepository.unassignOwner(userId, clubId)
        if (!unassigned) throw AppError.badRequest("Error desasignando dueño")
        const clubUnassigned = await ClubService.findClubById(clubId)
        if (!clubUnassigned) throw AppError.badRequest("Error desasignando dueño")
        return clubUnassigned
    }

    static async assignOwnerToClubByPublicId(userPublicId: string, clubPublicId: string): Promise<IClub> {
        const user = await this.UserRepository.findByPublicId(userPublicId)
        if (!user?.id) throw AppError.badRequest("Error asignando dueño")
        const club = await ClubService.findClubByPublicId(clubPublicId)
        if (!club?.id) throw AppError.badRequest("Error asignando dueño")
        return this.assignOwnerToClub(user.id, club.id)
    }

    static async unassignOwnerByPublicId(userPublicId: string, clubPublicId: string): Promise<IClub> {
        const user = await this.UserRepository.findByPublicId(userPublicId)
        if (!user?.id) throw AppError.badRequest("Error desasignando dueño")
        const club = await ClubService.findClubByPublicId(clubPublicId)
        if (!club?.id) throw AppError.badRequest("Error desasignando dueño")
        return this.unassingOwner(user.id, club.id)
    }

    static async revokeSessions(userId: number) {
        await this.UserRepository.incrementTokenVersion(userId)
    }
}
