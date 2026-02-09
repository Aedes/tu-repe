import { BaseRepository } from "./BaseRepository";
import { ClubWithCourts, IClub, Theme } from "../types";
import { pool } from "../config/db";

export class ClubRepository extends BaseRepository<IClub> {
    protected tableName = "clubs";
    protected primaryKey = "id";

    protected mapColumnsToFields(row: any): IClub {
        const mapped = super.mapColumnsToFields(row);
        if (mapped.theme && typeof mapped.theme === 'string') {
            try {
                mapped.theme = JSON.parse(mapped.theme);
            } catch (e) {
            }
        }
        return mapped;
    }

    async findByName(name: string): Promise<IClub | null> {
        return await this.findOneBy({ name } as Partial<IClub>);
    }

    async findAllWithCourts(): Promise<ClubWithCourts[]> {
        try {
            const [rows]: any = await pool.query(
                `SELECT 
                    c.id as club_id, 
                    c.public_id as club_public_id,
                    c.name as club_name, 
                    c.open_time, 
                    c.close_time,
                    c.appointment_duration,
                    c.country,
                    c.province,
                    c.city,
                    c.address,
                    c.url_id,
                    c.phone,
                    c.instagram_handle,
                    c.description,
                    c.profile_image_url,
                    c.profile_image_public_id,
                    c.cover_image_url,
                    c.cover_image_public_id,
                    c.theme,
                    ct.id as court_id,
                    ct.public_id as court_public_id,
                    ct.name as court_name,
                    ct.camera_host,
                    ct.camera_path,
                    ct.stream_key
                FROM clubs c
                LEFT JOIN courts ct ON c.id = ct.club_id
                ORDER BY c.id, ct.id`
            );

            const clubsMap = new Map<number, any>();

            for (const row of rows) {
                if (!clubsMap.has(row.club_id)) {
                    clubsMap.set(row.club_id, {
                        id: row.club_id,
                        publicId: row.club_public_id,
                        name: row.club_name,
                        openTime: row.open_time,
                        closeTime: row.close_time,
                        appointmentDuration: row.appointment_duration,
                        country: row.country,
                        province: row.province,
                        city: row.city,
                        address: row.address,
                        urlId: row.url_id,
                        phone: row.phone,
                        instagramHandle: row.instagram_handle,
                        description: row.description,
                        profileImageUrl: row.profile_image_url,
                        profileImagePublicId: row.profile_image_public_id,
                        coverImageUrl: row.cover_image_url,
                        coverImagePublicId: row.cover_image_public_id,
                        theme: row.theme,
                        courts: []
                    });
                }

                if (row.court_id) {
                    clubsMap.get(row.club_id).courts.push({
                        id: row.court_id,
                        publicId: row.court_public_id,
                        name: row.court_name,
                        cameraHost: row.camera_host,
                        cameraPath: row.camera_path,
                        streamKey: row.stream_key,
                    });
                }
            }

            return Array.from(clubsMap.values());
        } catch (error: any) {
            throw new Error(`Error al buscar clubs con courts: ${error.message}`);
        }
    }

    async updateTheme(id: number, theme: Theme): Promise<Theme | null> {
        try {
            const [rows]: any = await pool.query(
                `UPDATE clubs SET theme = ? WHERE id = ?`,
                [JSON.stringify(theme), id]
            );

            if (rows.affectedRows === 0) {
                return null;
            }
            return theme
        } catch (error: any) {
            throw new Error(`Error al actualizar colores del club: ${error.message}`);
        }
    }
}
