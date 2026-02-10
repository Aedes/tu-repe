import { ChildProcess } from "child_process";

declare module "express-serve-static-core" {
    interface Request {
        user?: {
            id: number;
        };
    }
}

export interface Theme {
    primary: string
    secondary: string
    background: string
}

export interface IClub {
    id?: number;
    publicId?: string;
    name: string;
    openTime: string;
    closeTime: string;
    appointmentDuration: number;
    country: string;
    province: string;
    city: string;
    address: string;
    urlId: string;
    phone?: string;
    instagramHandle?: string;
    description?: string;
    profileImageUrl?: string;
    coverImageUrl?: string;
    profileImagePublicId?: string;
    coverImagePublicId?: string;
    theme?: Theme
}

export interface ICourt {
    id?: number;
    publicId?: string;
    clubId: number;
    name: string;
    cameraHost: string;
    cameraPath: string;
    streamKey: string;
}

export interface IVideo {
    id?: number;
    publicId?: string;
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
    publicId?: string;
    filePath: string;
    fileName: string;
    clubId: number;
    courtId: number;
    endTime: Date;
    errorMessage?: string;
    attemptsCount: number;
    lastAttemptAt?: Date;
    createdAt?: Date;
    status: 'pending' | 'retrying' | 'failed_permanently';
}

export interface ActiveRecording {
    courtId: number;
    clubId: number;
    process: ChildProcess;
    outputPath: string;
    startTime: Date;
}

export interface IUser {
    id?: number;
    publicId?: string;
    email: string;
    passwordHash: string;
    name: string;
}

export interface UserWithClubs extends IUser {
    clubs: IClub[]
}
