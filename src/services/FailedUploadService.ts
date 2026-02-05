import { FailedUploadRepository } from "../repositories";
import { IFailedUpload } from "../types";

export class FailedUploadService {
    private static readonly FailedUploadRepository = new FailedUploadRepository();

    static async registerFailedUpload(
        filePath: string,
        fileName: string,
        clubId: number,
        courtId: number,
        endTime: Date,
        errorMessage: string
    ): Promise<IFailedUpload> {
        return await this.FailedUploadRepository.create({
            filePath,
            fileName,
            clubId,
            courtId,
            endTime,
            errorMessage,
            attemptsCount: 0,
            status: 'pending'
        } as Partial<IFailedUpload>);
    }

    static async getPendingAndRetrying(): Promise<IFailedUpload[]> {
        return await this.FailedUploadRepository.findPendingAndRetrying();
    }

    static async incrementAttempts(id: number, errorMessage?: string): Promise<IFailedUpload | null> {
        return await this.FailedUploadRepository.incrementAttempts(id, errorMessage);
    }

    static async markAsPermanentlyFailed(id: number): Promise<IFailedUpload | null> {
        return await this.FailedUploadRepository.markAsPermanentlyFailed(id);
    }

    static async deleteFailedUpload(id: number): Promise<boolean> {
        return await this.FailedUploadRepository.delete(id);
    }

    static async getOldPermanentlyFailed(daysOld: number = 30): Promise<IFailedUpload[]> {
        return await this.FailedUploadRepository.findOldPermanentlyFailed(daysOld);
    }
}

