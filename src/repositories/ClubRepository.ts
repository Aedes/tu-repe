import { BaseRepository } from "./BaseRepository";
import { ClubWithCourts, IClub } from "../types";
import { pool } from "../config/db";

export class ClubRepository extends BaseRepository<IClub> {
    protected tableName = "clubs";
    protected primaryKey = "id";

    async findByName(name: string): Promise<IClub | null> {
        return await this.findOneBy({ name } as Partial<IClub>);
    }

    async findAllWithCourts(): Promise<ClubWithCourts[]> {
        try {
            const [rows]: any = await pool.query(
                `SELECT 
                    c.id as club_id, 
                    c.name as club_name, 
                    c.open_time, 
                    c.close_time,
                    c.appointment_duration,
                    ct.id as court_id,
                    ct.name as court_name,
                    ct.rtsp_url
                FROM clubs c
                LEFT JOIN courts ct ON c.id = ct.club_id
                ORDER BY c.id, ct.id`
            );

            const clubsMap = new Map<number, any>();

            for (const row of rows) {
                if (!clubsMap.has(row.club_id)) {
                    clubsMap.set(row.club_id, {
                        id: row.club_id,
                        name: row.club_name,
                        openTime: row.open_time,
                        closeTime: row.close_time,
                        appointmentDuration: row.appointment_duration,
                        courts: []
                    });
                }

                if (row.court_id) {
                    clubsMap.get(row.club_id).courts.push({
                        id: row.court_id,
                        name: row.court_name,
                        rtspUrl: row.rtsp_url
                    });
                }
            }

            return Array.from(clubsMap.values());
        } catch (error: any) {
            throw new Error(`Error al buscar clubs con courts: ${error.message}`);
        }
    }
}
