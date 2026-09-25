import { BaseRepository } from "./BaseRepository"
import { ICourt } from "../types"
import { pool } from "../config/db"

export class CourtRepository extends BaseRepository<ICourt> {
    protected tableName = "courts"
    protected primaryKey = "id"

    async findByClubId(clubId: number): Promise<ICourt[]> {
        return this.findBy({ clubId } as Partial<ICourt>)
    }

    async findByStreamKey(streamKey: string): Promise<ICourt | null> {
        return this.findOneBy({ streamKey } as Partial<ICourt>)
    }

    async findByNameAndClub(name: string, clubId: number): Promise<ICourt | null> {
        const [rows] = await pool.query(
            `SELECT * FROM ${this.tableName} WHERE name = ? AND club_id = ?`,
            [name, clubId]
        )
        const result = rows as Record<string, unknown>[]
        if (result.length === 0) return null
        return this.mapColumnsToFields(result[0])
    }
}
