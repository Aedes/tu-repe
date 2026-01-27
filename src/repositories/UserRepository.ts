import { BaseRepository } from "./BaseRepository";
import { IClub, IUser, UserWithClubs } from "../types";
import { pool } from "../config/db";

export class UserRepository extends BaseRepository<IUser> {
    protected tableName = "users";
    protected primaryKey = "id";

    async findClubsByUserId(userId: number): Promise<number[]> {
        try {
            const [rows]: any = await pool.query(
                `SELECT club_id FROM user_clubs WHERE user_id = ?`,
                [userId]
            );

            return rows.map((row: any) => row.club_id);
        } catch (error: any) {
            throw new Error(`Error al buscar clubes por userId: ${error.message}`);
        }
    }

    async findByEmail(email: string): Promise<IUser | null> {
        try {
            const [rows]: any = await pool.query(
                `SELECT * FROM ${this.tableName} WHERE email = ? LIMIT 1`,
                [email]
            );

            if (rows.length === 0) {
                return null;
            }

            return rows[0] as IUser;
        } catch (error: any) {
            throw new Error(`Error finding user by email: ${error.message}`);
        }
    }

    async requireOwnerOfClub(userId: string, clubId: string): Promise<boolean> {
        try {
            const [rows]: any = await pool.query(`
                SELECT 1
                FROM club_users
                WHERE user_id = ? AND club_id = ? AND role = 'OWNER'`,
                [userId, clubId]
            );

            return rows.length

        } catch (error: any) {
            throw new Error(`Error obteniendo dueño del club: ${error.message}`);
        }
    }

    async requireOwnerOfCourt(userId: string, courtId: string): Promise<boolean> {
        try {
            const [rows]: any = await pool.query(`
                SELECT 1
                FROM courts c
                JOIN club_users cu ON cu.club_id = c.club_id
                WHERE c.id = ? AND cu.user_id = ?`,
                [courtId, userId]
            );

            return rows.length

        } catch (error: any) {
            throw new Error(`Error obteniendo dueño de la cancha: ${error.message}`);
        }
    }

    async getAllUsersWithClubs(): Promise<UserWithClubs[]> {
        try {
            const users = await this.findAll()
            if (!users || users.length === 0) return [];

            const [clubsRows]: any = await pool.query(`
                SELECT cu.user_id, c.*
                FROM club_users cu
                JOIN clubs c ON c.id = cu.club_id
            `);

            const toCamelCase = (obj: any) => {
                const result: any = {};
                for (const key in obj) {
                    const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
                    result[camelKey] = obj[key];
                }
                return result;
            }

            const clubsByUser: { [userId: number]: IClub[] } = {};
            for (const row of clubsRows) {
                const userId = row.user_id;
                if (!clubsByUser[userId]) clubsByUser[userId] = [];
                const { user_id, ...clubData } = row;
                clubsByUser[userId].push(toCamelCase(clubData) as IClub);
            }

            const usersWithClubs: UserWithClubs[] = users.map((user: any) => ({
                id: user.id,
                email: user.email,
                name: user.name,
                passwordHash: user.password_hash,
                clubs: clubsByUser[user.id] || []
            }));

            const camelCaseUsersWithClubs = usersWithClubs.map((user: any) => ({
                id: user.id,
                email: user.email,
                name: user.name,
                passwordHash: user.passwordHash,
                clubs: user.clubs
            }));

            return camelCaseUsersWithClubs;
        } catch (error: any) {
            throw new Error(`Error obteniendo usuarios: ${error.message}`);
        }
    }

    async assingOwnerToClub(userId: number, clubId: number): Promise<IClub> {
        try {
            const [result]: any = await pool.query(`
                INSERT INTO club_users (club_id, user_id)
                VALUES (?, ?)`,
                [clubId, userId]
            );

            if (!result || result.affectedRows === 0) {
                throw new Error("No se pudo asignar el dueño al club, la inserción falló.");
            }

            return result;
        } catch (error: any) {
            throw new Error(`Error asignando dueño a club: ${error.message}`);
        }
    }

    async unassignOwner(userId: number, clubId: number): Promise<boolean> {
        try {
            const [result]: any = await pool.query(`
                DELETE FROM club_users
                WHERE user_id = ? AND club_id = ?`,
                [userId, clubId]
            );

            if (!result || result.affectedRows === 0) {
                throw new Error("No se pudo desasignar el dueño del club, la relación no existe.");
            }

            return true;
        } catch (error: any) {
            throw new Error(`Error desasignando dueño del club: ${error.message}`);
        }
    }
}