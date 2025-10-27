import { CourtRepository } from "../repositories";
import { ICourt } from "../types";

export class CourtService {
    private static readonly CourtRepository = new CourtRepository()

    static createCourt(court: ICourt): Promise<ICourt> {
        return this.CourtRepository.create(court)
    }

    static findCourtById(id: number): Promise<ICourt | null> {
        return this.CourtRepository.findById(id)
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

    static updateCourt(id: number, newDataCourt: Partial<ICourt>): Promise<ICourt | null> {
        return this.CourtRepository.update(id, newDataCourt)
    }

    static deleteCourt(id: number): Promise<boolean> {
        return this.CourtRepository.delete(id)
    }
}