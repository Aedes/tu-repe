import { BaseRepository } from "./BaseRepository"
import { IClub, IUser, UserWithClubs } from "../types"
import { pool } from "../config/db"

export class UserRepository extends BaseRepository<IUser> {
    protected tableName = "users"
    protected primaryKey = "id"

    async findByEmail(email: string): Promise<IUser | null> {
        const [rows] = await pool.query(
            `SELECT * FROM ${this.tableName} WHERE email = ? LIMIT 1`,
            [email]
        )
        const result = rows as Record<string, any>[]
        if (result.length === 0) return null
        return this.mapColumnsToFields(result[0])
    }

    async requireOwnerOfClub(userId: string, clubId: string): Promise<boolean> {
        const [rows] = await pool.query(
            `SELECT 1 FROM club_users WHERE user_id = ? AND club_id = ? AND role = 'OWNER'`,
            [userId, clubId]
        )
        return (rows as unknown[]).length > 0
    }

    async requireOwnerOfCourt(userId: string, courtId: string): Promise<boolean> {
        const [rows] = await pool.query(
            `SELECT 1
             FROM courts c
             JOIN club_users cu ON cu.club_id = c.club_id
             WHERE c.id = ? AND cu.user_id = ? AND cu.role = 'OWNER'`,
            [courtId, userId]
        )
        return (rows as unknown[]).length > 0
    }

    async getAllUsersWithClubs(): Promise<UserWithClubs[]> {
        const users = await this.findAll()
        if (!users.length) return []

        const [clubsRows] = await pool.query(`
            SELECT cu.user_id, c.*
            FROM club_users cu
            JOIN clubs c ON c.id = cu.club_id
        `)

        const toCamelCase = (obj: Record<string, unknown>) => {
            const result: Record<string, unknown> = {}
            for (const key in obj) {
                const camelKey = key.replace(/_([a-z])/g, (_m, g: string) => g.toUpperCase())
                result[camelKey] = obj[key]
            }
            return result
        }

        const clubsByUser: Record<number, IClub[]> = {}
        for (const row of clubsRows as Record<string, any>[]) {
            const userId = row.user_id
            if (!clubsByUser[userId]) clubsByUser[userId] = []
            const { user_id: _userId, ...clubData } = row
            clubsByUser[userId].push(toCamelCase(clubData) as unknown as IClub)
        }

        return users.map((user) => ({
            id: user.id,
            publicId: user.publicId,
            email: user.email,
            name: user.name,
            passwordHash: user.passwordHash,
            systemRole: user.systemRole,
            isActive: user.isActive,
            tokenVersion: user.tokenVersion,
            totpEnabled: user.totpEnabled,
            clubs: clubsByUser[user.id!] || [],
        }))
    }

    async assingOwnerToClub(userId: number, clubId: number) {
        const [result] = await pool.query(
            `INSERT INTO club_users (club_id, user_id) VALUES (?, ?)`,
            [clubId, userId]
        )
        if (!(result as { affectedRows: number }).affectedRows) {
            throw new Error("No se pudo asignar el dueño al club")
        }
        return result
    }

    async unassignOwner(userId: number, clubId: number): Promise<boolean> {
        const [result] = await pool.query(
            `DELETE FROM club_users WHERE user_id = ? AND club_id = ?`,
            [userId, clubId]
        )
        if (!(result as { affectedRows: number }).affectedRows) {
            throw new Error("La relación no existe")
        }
        return true
    }

    async incrementTokenVersion(id: number) {
        await pool.query(`UPDATE users SET token_version = token_version + 1 WHERE id = ?`, [id])
    }
}
