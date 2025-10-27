import { pool } from "../config/db";

export abstract class BaseRepository<T> {
    protected abstract tableName: string;
    protected abstract primaryKey: string;

    protected mapFieldsToColumns(data: Partial<T>): Record<string, any> {
        const mapped: Record<string, any> = {};
        for (const [key, value] of Object.entries(data)) {
            const columnName = this.camelToSnake(key);
            mapped[columnName] = value;
        }
        return mapped;
    }

    protected camelToSnake(str: string): string {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }

    protected mapColumnsToFields(row: any): T {
        const mapped: any = {};
        for (const [key, value] of Object.entries(row)) {
            const fieldName = this.snakeToCamel(key);
            mapped[fieldName] = value;
        }
        return mapped as T;
    }

    protected snakeToCamel(str: string): string {
        return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    }

    async create(data: Partial<T>): Promise<T> {
        try {
            const fields = this.mapFieldsToColumns(data);
            const columns = Object.keys(fields).join(", ");
            const values = Object.values(fields);
            const placeholders = values.map(() => "?").join(", ");

            const [result]: any = await pool.query(
                `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`,
                values
            );

            const created = await this.findById(result.insertId);
            if (!created) {
                throw new Error(`No se pudo recuperar el registro creado`);
            }
            return created;
        } catch (error: any) {
            throw new Error(`Error al crear ${this.tableName}: ${error.message}`);
        }
    }

    async findById(id: number): Promise<T | null> {
        try {
            const [rows]: any = await pool.query(
                `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = ?`,
                [id]
            );

            if (rows.length === 0) {
                return null;
            }

            return this.mapColumnsToFields(rows[0]);
        } catch (error: any) {
            throw new Error(`Error al buscar ${this.tableName} por ID: ${error.message}`);
        }
    }

    async findAll(): Promise<T[]> {
        try {
            const [rows]: any = await pool.query(`SELECT * FROM ${this.tableName}`);

            return rows.map((row: any) => this.mapColumnsToFields(row));
        } catch (error: any) {
            throw new Error(`Error al buscar todos los ${this.tableName}: ${error.message}`);
        }
    }

    async update(id: number, data: Partial<T>): Promise<T | null> {
        try {
            const fields = this.mapFieldsToColumns(data);
            const setClause = Object.keys(fields)
                .map(key => `${key} = ?`)
                .join(", ");
            const values = [...Object.values(fields), id];

            const [result]: any = await pool.query(
                `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.primaryKey} = ?`,
                values
            );

            if (result.affectedRows === 0) {
                return null;
            }

            return await this.findById(id);
        } catch (error: any) {
            throw new Error(`Error al actualizar ${this.tableName}: ${error.message}`);
        }
    }

    async delete(id: number): Promise<boolean> {
        try {
            const [result]: any = await pool.query(
                `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ?`,
                [id]
            );

            return result.affectedRows > 0;
        } catch (error: any) {
            throw new Error(`Error al eliminar ${this.tableName}: ${error.message}`);
        }
    }

    async findBy(criteria: Partial<T>): Promise<T[]> {
        try {
            const fields = this.mapFieldsToColumns(criteria);
            const conditions = Object.keys(fields)
                .map(key => `${key} = ?`)
                .join(" AND ");
            const values = Object.values(fields);

            const [rows]: any = await pool.query(
                `SELECT * FROM ${this.tableName} WHERE ${conditions}`,
                values
            );

            return rows.map((row: any) => this.mapColumnsToFields(row));
        } catch (error: any) {
            throw new Error(`Error al buscar ${this.tableName}: ${error.message}`);
        }
    }

    async findOneBy(criteria: Partial<T>): Promise<T | null> {
        const results = await this.findBy(criteria);
        return results.length > 0 ? results[0] : null;
    }
}