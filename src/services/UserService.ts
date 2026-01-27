import { UserRepository } from "../repositories/UserRepository";
import { IClub, IUser, UserWithClubs } from "../types";
import bcrypt from "bcrypt"
import { ClubService } from "./ClubService";

export class UserService {
    private static readonly UserRepository = new UserRepository()

    static createUser(user: IUser): Promise<IUser> {
        return this.UserRepository.create(user)
    }

    static findUserById(id: number): Promise<IUser | null> {
        return this.UserRepository.findById(id)
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

    static deleteUser(id: number): Promise<boolean> {
        return this.UserRepository.delete(id)
    }

    static comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
        return bcrypt.compare(plainPassword, hashedPassword)
    }

    static requireOwnerOfClub(userId: string, clubId: string): Promise<boolean> {
        return this.UserRepository.requireOwnerOfClub(userId, clubId)
    }

    static requireOwnerOfCourt(userId: string, courtId: string): Promise<boolean> {
        return this.UserRepository.requireOwnerOfCourt(userId, courtId)
    }

    static getAllUsersWithClubs(): Promise<UserWithClubs[]> {
        return this.UserRepository.getAllUsersWithClubs()
    }

    static async assignOwnerToClub(userId: number, clubId: number): Promise<IClub> {
        try {
            const assigned = await this.UserRepository.assingOwnerToClub(userId, clubId)

            if (!assigned) {
                throw new Error(`Error asignando dueño`)
            }

            const clubAssigned = await ClubService.findClubById(clubId)

            if (!clubAssigned) {
                throw new Error(`Error asignando dueño`)
            }

            return clubAssigned

        } catch (error: any) {
            throw new Error(`Error asignando dueño: ${error}`)
        }
    }

    static async unassingOwner(userId: number, clubId: number): Promise<IClub> {
        try {
            const unassigned = await this.UserRepository.unassignOwner(userId, clubId)

            if (!unassigned) {
                throw new Error(`Error desasignando dueño`)
            }

            const clubUnassigned = await ClubService.findClubById(clubId)

            if (!clubUnassigned) {
                throw new Error(`Error asignando dueño`)
            }

            return clubUnassigned

        } catch (error: any) {
            throw new Error(`Error desasignando dueño: ${error}`)
        }
    }
}