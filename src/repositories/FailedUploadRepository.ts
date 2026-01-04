import { BaseRepository } from "./BaseRepository";
import { IFailedUpload } from "../types";
import { pool } from "../config/db";

export class FailedUploadRepository extends BaseRepository<IFailedUpload> {
    protected tableName = "failed_uploads";
    protected primaryKey = "id";

    async findPending(): Promise<IFailedUpload[]> {
        return await this.findBy({ status: 'pending' } as Partial<IFailedUpload>);
    }

    async findRetrying(): Promise<IFailedUpload[]> {
        return await this.findBy({ status: 'retrying' } as Partial<IFailedUpload>);
    }

    async findPendingAndRetrying(): Promise<IFailedUpload[]> {
        try {
            const [rows]: any = await pool.query(
                `SELECT * FROM ${this.tableName} 
                WHERE status IN ('pending', 'retrying') 
                ORDER BY created_at ASC`
            );

            return rows.map((row: any) => this.mapColumnsToFields(row));
        } catch (error: any) {
            throw new Error(`Error al buscar failed uploads pendientes: ${error.message}`);
        }
    }

    async findPermanentlyFailed(): Promise<IFailedUpload[]> {
        return await this.findBy({ status: 'failed_permanently' } as Partial<IFailedUpload>);
    }

    async findOldPermanentlyFailed(daysOld: number): Promise<IFailedUpload[]> {
        try {
            const [rows]: any = await pool.query(
                `SELECT * FROM ${this.tableName} 
                WHERE status = 'failed_permanently' 
                AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
                ORDER BY created_at ASC`,
                [daysOld]
            );

            return rows.map((row: any) => this.mapColumnsToFields(row));
        } catch (error: any) {
            throw new Error(`Error al buscar failed uploads antiguos: ${error.message}`);
        }
    }

    async incrementAttempts(id: number, errorMessage?: string): Promise<IFailedUpload | null> {
        try {
            const [result]: any = await pool.query(
                `UPDATE ${this.tableName} 
                SET attempts_count = attempts_count + 1, 
                    last_attempt_at = NOW(),
                    error_message = COALESCE(?, error_message),
                    status = 'retrying'
                WHERE ${this.primaryKey} = ?`,
                [errorMessage, id]
            );

            if (result.affectedRows === 0) {
                return null;
            }

            return await this.findById(id);
        } catch (error: any) {
            throw new Error(`Error al incrementar intentos: ${error.message}`);
        }
    }

    async markAsPermanentlyFailed(id: number): Promise<IFailedUpload | null> {
        try {
            const [result]: any = await pool.query(
                `UPDATE ${this.tableName} 
                SET status = 'failed_permanently'
                WHERE ${this.primaryKey} = ?`,
                [id]
            );

            if (result.affectedRows === 0) {
                return null;
            }

            return await this.findById(id);
        } catch (error: any) {
            throw new Error(`Error al marcar como permanentemente fallido: ${error.message}`);
        }
    }
}

