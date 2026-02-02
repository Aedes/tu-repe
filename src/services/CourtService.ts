import { CourtRepository } from "../repositories";
import { ICourt } from "../types";
import fs from "fs";
import path from "path";
import crypto from "crypto"

export class CourtService {
    private static readonly CourtRepository = new CourtRepository()

    static async createCourt(court: ICourt): Promise<ICourt> {
        const newCourt = await this.CourtRepository.create(court)
        this.createCourtDirectories(court.clubId, newCourt.id!)
        return newCourt
    }

    private static createCourtDirectories(clubId: number, courtId: number): void {
        try {
            const base = "/var/videos"
            const clubPath = path.join(base, `club_${clubId}`)
            const courtPath = path.join(clubPath, `court_${courtId}`)

            if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true })
            if (!fs.existsSync(clubPath)) fs.mkdirSync(clubPath, { recursive: true })
            if (!fs.existsSync(courtPath)) fs.mkdirSync(courtPath, { recursive: true })
        } catch (error: any) {
            throw new Error(`Error al crear directorios para la cancha: ${error.message}`)
        }
    }

    static findCourtById(id: number): Promise<ICourt | null> {
        return this.CourtRepository.findById(id)
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

    static updateCourt(id: number, newDataCourt: Partial<ICourt>): Promise<ICourt | null> {
        return this.CourtRepository.update(id, newDataCourt)
    }

    static async deleteCourt(id: number): Promise<boolean> {
        const court = await this.CourtRepository.findById(id)
        const deleted = await this.CourtRepository.delete(id)

        if (deleted && court) {
            this.deleteCourtDirectories(court.clubId, id)
        }

        return deleted
    }

    private static deleteCourtDirectories(clubId: number, courtId: number): void {
        try {
            const courtPath = path.join("/var/videos", `club_${clubId}`, `court_${courtId}`)

            if (fs.existsSync(courtPath)) {
                fs.rmSync(courtPath, { recursive: true, force: true })
            }
        } catch (error: any) {
            throw new Error(`Error al eliminar directorios de la cancha: ${error.message}`)
        }
    }

    static generateStreamKey(numberCourt: string): string {
        const randomPart = crypto.randomBytes(9).toString("base64url")
        return `cancha${numberCourt}_${randomPart}`
    }

    static async verifyStream(path: string) {
        const clubId = path.split("/")[0].split("_")[1]
        const streamKey = path.split("/")[1]

        const courtsOfClub = await this.getCourtsByClubId(parseInt(clubId!))
        const court = await this.findCourtByStreamkey(streamKey!)

        const isCourtOfClub = court && courtsOfClub.some(c => c.id === court.id);

        if (!court || !isCourtOfClub) {
            throw new Error(`Stream Key inválida: ${streamKey}`)
        }

        return true
    }
}