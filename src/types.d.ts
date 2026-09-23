import { ChildProcess } from "child_process"

declare module "express-serve-static-core" {
    interface Request {
        user?: {
            id: number
            publicId: string
            role: "admin" | "user"
            tokenVersion: number
        }
        requestId?: string
        csrfToken?: string
    }
}

export interface Theme {
    primary: string
    secondary: string
    background: string
}

export type SystemRole = "ADMIN" | "USER"
export type VideoStatus = "available" | "deleting" | "deleted"
export type IngestionStatus = "pending" | "uploading" | "uploaded" | "completed" | "retrying" | "failed_permanently"
export type DeletionStatus = "pending" | "in_progress" | "completed" | "failed"

export interface IClub {
    id?: number
    publicId?: string
    name: string
    openTime: string
    closeTime: string
    appointmentDuration: number
    country: string
    province: string
    city: string
    address: string
    urlId: string
    phone?: string | null
    instagramHandle?: string | null
    description?: string | null
    profileImageUrl?: string | null
    coverImageUrl?: string | null
    profileImagePublicId?: string | null
    coverImagePublicId?: string | null
    theme?: Theme | null
}

export interface ICourt {
    id?: number
    publicId?: string
    clubId: number
    name: string
    cameraHost: string
    cameraPath: string
    streamKey: string
}

export interface IVideo {
    id?: number
    publicId?: string
    courtId: number
    fileName: string
    startTime: Date
    endTime: Date
    b2FilePath: string
    status?: VideoStatus
    expiresAt?: Date
}

export type ClubCreateDTO = Omit<IClub, "id">
export type CourtCreateDTO = Omit<ICourt, "id">
export type VideoCreateDTO = Omit<IVideo, "id">

export interface ClubWithCourts extends IClub {
    courts: ICourt[]
}

export interface IFailedUpload {
    id?: number
    publicId?: string
    filePath: string
    fileName: string
    clubId: number
    courtId: number
    endTime: Date
    errorMessage?: string
    attemptsCount: number
    lastAttemptAt?: Date
    createdAt?: Date
    status: "pending" | "retrying" | "failed_permanently"
}

export interface IIngestionJob {
    id?: number
    publicId?: string
    filePath: string
    fileName: string
    clubId: number
    courtId: number
    startTime: Date
    endTime: Date
    b2FilePath?: string | null
    status: IngestionStatus
    attemptsCount: number
    errorMessage?: string | null
    lockedAt?: Date | null
    createdAt?: Date
    updatedAt?: Date
}

export interface IDeletionJob {
    id?: number
    publicId?: string
    videoId?: number | null
    courtId?: number | null
    clubId?: number | null
    b2FilePath: string
    status: DeletionStatus
    attemptsCount: number
    errorMessage?: string | null
    lockedAt?: Date | null
}

export type RecordingState = "starting" | "running" | "stopping"

export interface ActiveRecording {
    courtId: number
    clubId: number
    process: ChildProcess
    outputPath: string
    startTime: Date
    state: RecordingState
}

export interface IUser {
    id?: number
    publicId?: string
    email: string
    passwordHash: string
    name: string
    systemRole?: SystemRole
    isActive?: boolean
    tokenVersion?: number
    totpSecret?: string | null
    totpEnabled?: boolean
}

export interface UserWithClubs extends IUser {
    clubs: IClub[]
}

export interface PublicClubDTO {
    id: string
    name: string
    openTime: string
    closeTime: string
    appointmentDuration: number
    country: string
    province: string
    city: string
    address: string
    urlId: string
    phone?: string | null
    instagramHandle?: string | null
    description?: string | null
    profileImageUrl?: string | null
    coverImageUrl?: string | null
    theme?: Theme | null
}

export interface PublicCourtDTO {
    id: string
    name: string
}

export interface OwnerCourtDTO {
    id: string
    name: string
}

export interface AdminCourtDTO {
    id: string
    name: string
    cameraHost: string
    cameraPath: string
}

export interface AdminCourtCreatedDTO extends AdminCourtDTO {
    streamKey: string
}
