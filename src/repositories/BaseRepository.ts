import { generatePublicId } from "../utils/publicId"
import { pool } from "../config/db"
import { AppError } from "../errors/AppError"
import { PoolConnection } from "mysql2/promise"

export abstract class BaseRepository<T> {
    protected abstract tableName: string
    protected abstract primaryKey: string

    protected mapFieldsToColumns(data: Partial<T>): Record<string, unknown> {
        const mapped: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(data)) {
            mapped[this.camelToSnake(key)] = value
        }
        return mapped
    }

    protected camelToSnake(str: string): string {
        return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    }

    protected mapColumnsToFields(row: Record<string, unknown>): T {
        const mapped: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(row)) {
            mapped[this.snakeToCamel(key)] = value
        }
        return mapped as T
    }

    protected snakeToCamel(str: string): string {
        return str.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase())
    }

    async create(data: Partial<T>, connection?: PoolConnection): Promise<T> {
        const fields = this.mapFieldsToColumns(data)
        if (fields.public_id === undefined) {
            fields.public_id = generatePublicId()
        }
        const columns = Object.keys(fields).join(", ")
        const values = Object.values(fields)
        const placeholders = values.map(() => "?").join(", ")

        const db = connection || pool
        const [result] = await db.query(
            `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`,
            values
        )
        const created = await this.findById((result as { insertId: number }).insertId, connection)
        if (!created) {
            throw new Error(`No se pudo recuperar el registro creado`)
        }
        return created
    }

    async findById(id: number, connection?: PoolConnection): Promise<T | null> {
        const db = connection || pool
        const [rows] = await db.query(
            `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = ?`,
            [id]
        )
        const result = rows as Record<string, unknown>[]
        if (result.length === 0) return null
        return this.mapColumnsToFields(result[0])
    }

    async findByPublicId(publicId: string): Promise<T | null> {
        const [rows] = await pool.query(
            `SELECT * FROM ${this.tableName} WHERE public_id = ?`,
            [publicId]
        )
        const result = rows as Record<string, unknown>[]
        if (result.length === 0) return null
        return this.mapColumnsToFields(result[0])
    }

    async findAll(): Promise<T[]> {
        const [rows] = await pool.query(`SELECT * FROM ${this.tableName}`)
        return (rows as Record<string, unknown>[]).map((row) => this.mapColumnsToFields(row))
    }

    async update(id: number, data: Partial<T>): Promise<T | null> {
        const fields = this.mapFieldsToColumns(data)
        const keys = Object.keys(fields)
        if (keys.length === 0) {
            throw AppError.badRequest("No hay campos para actualizar")
        }
        const setClause = keys.map((key) => `${key} = ?`).join(", ")
        const values = [...Object.values(fields), id]
        const [result] = await pool.query(
            `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.primaryKey} = ?`,
            values
        )
        if ((result as { affectedRows: number }).affectedRows === 0) return null
        return this.findById(id)
    }

    async delete(id: number): Promise<boolean> {
        const [result] = await pool.query(
            `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ?`,
            [id]
        )
        return (result as { affectedRows: number }).affectedRows > 0
    }

    async findBy(criteria: Partial<T>): Promise<T[]> {
        const fields = this.mapFieldsToColumns(criteria)
        const conditions = Object.keys(fields).map((key) => `${key} = ?`).join(" AND ")
        const values = Object.values(fields)
        const [rows] = await pool.query(
            `SELECT * FROM ${this.tableName} WHERE ${conditions}`,
            values
        )
        return (rows as Record<string, unknown>[]).map((row) => this.mapColumnsToFields(row))
    }

    async findOneBy(criteria: Partial<T>): Promise<T | null> {
        const results = await this.findBy(criteria)
        return results.length > 0 ? results[0] : null
    }
}
