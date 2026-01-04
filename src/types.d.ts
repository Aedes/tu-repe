export interface IClub {
    id?: number;
    name: string;
    openTime: string;
    closeTime: string;
}

export interface ICourt {
    id?: number;
    clubId: number;
    name: string;
    rtspUrl: string;
}

export interface IVideo {
    id?: number;
    courtId: number;
    fileName: string;
    startTime: Date;
    endTime: Date;
    b2FilePath: string;
}

export type ClubCreateDTO = Omit<IClub, 'id'>;
export type CourtCreateDTO = Omit<ICourt, 'id'>;
export type VideoCreateDTO = Omit<IVideo, 'id'>;

export interface ClubWithCourts extends IClub {
    courts: ICourt[];
}

export interface IFailedUpload {
    id?: number;
    filePath: string;
    fileName: string;
    clubId: number;
    courtId: number;
    errorMessage?: string;
    attemptsCount: number;
    lastAttemptAt?: Date;
    createdAt?: Date;
    status: 'pending' | 'retrying' | 'failed_permanently';
}