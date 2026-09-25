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
export type AppointmentVideoStatus = "pending" | "processing" | "completed" | "retrying" | "failed_permanently" | "deleting" | "deleted"
export type AppointmentProcessingStep = "downloading" | "validating" | "concatenating" | "uploading"
export type AppointmentFallbackReason = "incomplete_sources" | "merge_failed" | "merge_disabled"
export type AppointmentRenderMode = "parts" | "unified" | "assess"
export type PartsNotice = "gaps" | "incompatible"

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
    mergeSignature?: string | null
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
    appointmentVideoJobId?: number | null
    courtId?: number | null
    clubId?: number | null
    b2FilePath: string
    status: DeletionStatus
    attemptsCount: number
    errorMessage?: string | null
    lockedAt?: Date | null
}

export interface IAppointmentVideoJob {
    id?: number
    publicId?: string
    courtId: number
    clubId: number
    appointmentStart: Date
    appointmentEnd: Date
    cacheKey: string
    sourceVideoIds: number[]
    sourceCount: number
    b2FilePath?: string | null
    status: AppointmentVideoStatus
    processingStep?: AppointmentProcessingStep | null
    attemptsCount: number
    errorCode?: string | null
    errorMessage?: string | null
    lockedAt?: Date | null
    expiresAt?: Date | null
    createdAt?: Date
    updatedAt?: Date
}

export type VideoPartUrl = { url: string; startTime: string; endTime: string }

export type AppointmentRenderResponse =
    | { status: "ready"; jobId?: string; videoUrl: string; urlExpiresAt: string; startTime: string; endTime: string; playbackStartTime: string }
    | { status: "queued" | "processing"; jobId: string; pollAfterMs: number }
    | { status: "parts"; notice?: PartsNotice; startTime: string; endTime: string; parts: VideoPartUrl[] }
    | { status: "choice"; continuationToken: string; startTime: string; endTime: string; parts: VideoPartUrl[] }
    | { status: "fallback"; reason: AppointmentFallbackReason; jobId?: string; startTime: string; endTime: string; parts: VideoPartUrl[] }
    | { status: "not_found" }

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
