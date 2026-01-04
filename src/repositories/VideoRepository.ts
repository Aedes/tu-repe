import { BaseRepository } from "./BaseRepository";
import { IVideo } from "../types";
import { pool } from "../config/db";

export class VideoRepository extends BaseRepository<IVideo> {
    protected tableName = "videos";
    protected primaryKey = "id";

    async findByCourtId(courtId: number): Promise<IVideo[]> {
        return await this.findBy({ courtId } as Partial<IVideo>);
    }

    async findByDateRange(startTime: Date, endTime: Date): Promise<IVideo[]> {
        try {
            const [rows]: any = await pool.query(
                `SELECT * FROM ${this.tableName} 
                WHERE start_time >= ? AND end_time <= ? 
                ORDER BY start_time ASC`,
                [startTime, endTime]
            );

            return rows.map((row: any) => this.mapColumnsToFields(row));
        } catch (error: any) {
            throw new Error(`Error al buscar videos por rango de fechas: ${error.message}`);
        }
    }

    async findByDateRangeAndCourtId(startTime: Date, endTime: Date, courtId: number): Promise<IVideo[]> {
        try {
            const [rows]: any = await pool.query(
                `SELECT * FROM ${this.tableName} 
                WHERE start_time >= ? AND end_time <= ? AND court_id = ? 
                ORDER BY start_time ASC`,
                [startTime, endTime, courtId]
            );

            return rows.map((row: any) => this.mapColumnsToFields(row));
        } catch (error: any) {
            throw new Error(`Error al buscar videos por rango de fechas y courtId: ${error.message}`);
        }
    }

    async findOverlappingVideos(courtId: number, startTime: Date, endTime: Date): Promise<IVideo[]> {
        try {
            const [rows]: any = await pool.query(
                `SELECT * FROM ${this.tableName} 
                WHERE court_id = ? 
                AND NOT (end_time <= ? OR start_time >= ?)`,
                [courtId, startTime, endTime]
            );

            return rows.map((row: any) => this.mapColumnsToFields(row));
        } catch (error: any) {
            throw new Error(`Error al buscar videos superpuestos: ${error.message}`);
        }
    }

    async findByFileNameOrB2FilePath(fileName: string, filePath: string): Promise<IVideo | null> {
        const results = await this.findBy({ fileName, b2FilePath: filePath } as Partial<IVideo>);
        return results.length > 0 ? results[0] : null;
    }
}
