import { BaseRepository } from "./BaseRepository";
import { ICourt } from "../types";
import { pool } from "../config/db";

export class CourtRepository extends BaseRepository<ICourt> {
    protected tableName = "courts";
    protected primaryKey = "id";

    async findByClubId(clubId: number): Promise<ICourt[]> {
        return await this.findBy({ clubId } as Partial<ICourt>);
    }

    async findByNameAndClub(name: string, clubId: number): Promise<ICourt | null> {
        try {
            const [rows]: any = await pool.query(
                `SELECT * FROM ${this.tableName} WHERE name = ? AND club_id = ?`,
                [name, clubId]
            );

            if (rows.length === 0) {
                return null;
            }

            return this.mapColumnsToFields(rows[0]);
        } catch (error: any) {
            throw new Error(`Error al buscar court por nombre y club: ${error.message}`);
        }
    }
}
