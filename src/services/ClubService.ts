import { ClubRepository } from "../repositories";
import { ClubWithCourts, IClub } from "../types";

export class ClubService {
    private static readonly ClubRepository = new ClubRepository()

    static createClub(club: IClub): Promise<IClub> {
        return this.ClubRepository.create(club)
    }

    static findClubById(id: number): Promise<IClub | null> {
        return this.ClubRepository.findById(id)
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

    static deleteClub(id: number): Promise<boolean> {
        return this.ClubRepository.delete(id)
    }
}