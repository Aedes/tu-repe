import { config } from "../config/config"
import { logger } from "../logger"
import { AppointmentVideoJobRepository } from "../repositories/AppointmentVideoJobRepository"
import { VideoRepository } from "../repositories/VideoRepository"
import { CourtService } from "./CourtService"
import { VideoService } from "./VideoService"
import { B2Service } from "./B2Service"
import { AppointmentVideoConcatService } from "./AppointmentVideoConcatService"
import { AppointmentMergeError } from "../errors/AppointmentMergeError"
import { appointmentCacheKey, assessAppointmentCoverage, earliestExpiry } from "./appointmentCoverage"
import { signaturesAreCompatible } from "./mergeSignature"
import { signRenderContinuation } from "../utils/renderContinuation"
import { AppointmentRenderResponse, IAppointmentVideoJob, IVideo, PartsNotice, VideoPartUrl } from "../types"

const POLL_AFTER_MS = 5_000

type AppointmentRenderMode = "parts" | "unified" | "assess"

export class AppointmentVideoService {
    private static readonly jobs = new AppointmentVideoJobRepository()
    private static readonly videos = new VideoRepository()
    private static processing = false
    private static idle: Promise<void> = Promise.resolve()

    static async requestRender(input: { startTime: Date; courtPublicId: string; clubUrlId: string; mode?: AppointmentRenderMode }): Promise<AppointmentRenderResponse> {
        const mode = input.mode || "assess"
        const courtId = await CourtService.resolveCourtId(input.courtPublicId)
        const context = await VideoService.resolveAppointmentContext(input.startTime, courtId, input.clubUrlId)
        const sources = await this.videos.findAvailableOverlapping(courtId, input.startTime, context.endTime)
        const coverage = assessAppointmentCoverage(
            sources,
            input.startTime,
            context.endTime,
            config.APPOINTMENT_MERGE_COVERAGE_TOLERANCE_MS
        )
        if (coverage.kind === "not_found") return { status: "not_found" }
        if (coverage.kind === "fallback") {
            return this.partsResponse(coverage.videos, input.startTime, context.endTime, "gaps")
        }
        if (mode === "parts") {
            return this.partsResponse(coverage.videos, input.startTime, context.endTime)
        }
        if (coverage.videos.length === 1) {
            return this.readyFromSource(coverage.videos[0], input.startTime, context.endTime)
        }
        if (!signaturesAreCompatible(coverage.videos.map((video) => video.mergeSignature))) {
            return this.partsResponse(coverage.videos, input.startTime, context.endTime, "incompatible")
        }
        if (!config.appointmentMergeEnabled) {
            if (mode === "unified") {
                return {
                    status: "fallback",
                    reason: "merge_disabled",
                    ...this.bounds(input.startTime, context.endTime),
                    parts: await this.signParts(coverage.videos),
                }
            }
            return this.partsResponse(coverage.videos, input.startTime, context.endTime, "incompatible")
        }

        const cacheKey = appointmentCacheKey(courtId, input.startTime, context.endTime)
        const existing = await this.jobs.findByCacheKey(cacheKey)
        if (existing?.status === "completed" && existing.b2FilePath && await B2Service.objectExists(existing.b2FilePath)) {
            logger.info({ jobId: existing.publicId, courtId, fragments: existing.sourceCount }, "appointment_merge_cache_hit")
            return this.readyFromJob(existing, input.startTime, context.endTime)
        }
        if (existing?.status === "failed_permanently") return this.fallbackForJob(existing)
        if (existing && existing.status !== "deleted" && existing.status !== "completed") {
            return this.progressResponse(existing)
        }
        if (mode === "assess") {
            return {
                status: "choice",
                continuationToken: signRenderContinuation({
                    clubUrlId: input.clubUrlId,
                    courtPublicId: input.courtPublicId,
                    startTime: new Date(input.startTime).toISOString(),
                }),
                ...this.bounds(input.startTime, context.endTime),
                parts: await this.signParts(coverage.videos),
            }
        }
        if (existing?.status === "completed" && existing.id) await this.jobs.markPending(existing.id)

        const job = await this.jobs.enqueueOrGet({
            courtId,
            clubId: context.court.clubId,
            appointmentStart: input.startTime,
            appointmentEnd: context.endTime,
            cacheKey,
            sourceVideoIds: coverage.videos.map((video) => video.id!),
            sourceCount: coverage.videos.length,
                expiresAt: this.expiryOf(coverage.videos),
        })
        if (!existing || existing.status === "deleted" || existing.status === "completed") {
            logger.info({ jobId: job.publicId, courtId, fragments: job.sourceCount }, "appointment_merge_queued")
        }
        return this.progressResponse(job)
    }

    static async getRenderStatus(publicId: string): Promise<AppointmentRenderResponse> {
        const job = await this.jobs.findByPublicId(publicId)
        if (!job || job.status === "deleted") return { status: "not_found" }
        if (job.status === "failed_permanently") return this.fallbackForJob(job)
        if (job.status === "completed" && job.b2FilePath) {
            if (!(await B2Service.objectExists(job.b2FilePath))) {
                if (job.id) await this.jobs.markPending(job.id)
                return { status: "processing", jobId: job.publicId!, pollAfterMs: POLL_AFTER_MS }
            }
            return this.readyFromJob(job, job.appointmentStart, job.appointmentEnd)
        }
        return this.progressResponse(job)
    }

    static async processNext(): Promise<boolean> {
        if (!config.appointmentMergeEnabled || this.processing) return false
        const job = await this.jobs.claimNext()
        if (!job?.id) return false
        this.processing = true
        let release: () => void = () => undefined
        this.idle = new Promise((resolve) => {
            release = resolve
        })
        try {
            await this.processJob(job)
            return true
        } finally {
            this.processing = false
            release()
        }
    }

    static waitForIdle() {
        return this.idle
    }

    private static async processJob(job: IAppointmentVideoJob) {
        const started = Date.now()
        logger.info({ jobId: job.publicId, courtId: job.courtId, fragments: job.sourceCount }, "appointment_merge_started")
        try {
            const sources = await this.loadSources(job)
            const coverage = assessAppointmentCoverage(
                sources,
                job.appointmentStart,
                job.appointmentEnd,
                config.APPOINTMENT_MERGE_COVERAGE_TOLERANCE_MS
            )
            if (coverage.kind !== "complete") {
                throw new AppointmentMergeError("INCOMPLETE_SOURCES", "Los fragmentos ya no cubren el turno", true)
            }
            const result = await AppointmentVideoConcatService.concat({
                clubId: job.clubId,
                courtId: job.courtId,
                cacheKey: job.cacheKey,
                sources: coverage.videos.map((video) => ({ b2FilePath: video.b2FilePath })),
                onStep: async (step) => {
                    if (job.id) await this.jobs.markStep(job.id, step)
                },
            })
            await this.jobs.markCompleted(job.id!, result.b2FilePath, this.expiryOf(sources))
            logger.info({
                jobId: job.publicId,
                courtId: job.courtId,
                fragments: sources.length,
                bytes: result.bytes,
                durationMs: Date.now() - started,
            }, "appointment_merge_completed")
        } catch (error) {
            if (error instanceof AppointmentMergeError && error.code === "ABORTED") {
                await this.jobs.releaseLock(job.id!)
                logger.info({ jobId: job.publicId }, "appointment_merge_aborted")
                return
            }
            const code = error instanceof AppointmentMergeError ? error.code : "MERGE_FAILED"
            const permanent = error instanceof AppointmentMergeError
                ? error.permanent || job.attemptsCount + 1 >= config.APPOINTMENT_MERGE_MAX_ATTEMPTS
                : job.attemptsCount + 1 >= config.APPOINTMENT_MERGE_MAX_ATTEMPTS
            const attempts = job.attemptsCount + 1
            await this.jobs.markRetry(job.id!, code, error instanceof Error ? error.message : "merge_failed", attempts, permanent)
            logger.error({ jobId: job.publicId, courtId: job.courtId, code, attempts }, permanent ? "appointment_merge_failed_permanently" : "appointment_merge_retry")
        }
    }

    private static async loadSources(job: IAppointmentVideoJob) {
        const stored = await this.videos.findByIds(job.sourceVideoIds)
        const byId = new Map(stored.map((video) => [video.id, video]))
        const ordered = job.sourceVideoIds.map((id) => byId.get(id))
        if (ordered.some((video) => !video || video.status !== "available" || !video.expiresAt || video.expiresAt.getTime() <= Date.now())) {
            throw new AppointmentMergeError("NO_SOURCES", "Faltan fragmentos disponibles", true)
        }
        return ordered as IVideo[]
    }

    private static async partsResponse(videos: IVideo[], start: Date, end: Date, notice?: PartsNotice): Promise<AppointmentRenderResponse> {
        return {
            status: "parts",
            ...(notice ? { notice } : {}),
            ...this.bounds(start, end),
            parts: await this.signParts(videos),
        }
    }

    private static async signParts(videos: IVideo[]): Promise<VideoPartUrl[]> {
        return Promise.all(videos.map(async (video) => ({
            startTime: new Date(video.startTime).toISOString(),
            endTime: new Date(video.endTime).toISOString(),
            url: await B2Service.getDownloadUrl(video.b2FilePath),
        })))
    }

    private static expiryOf(videos: IVideo[]) {
        return earliestExpiry(videos) || new Date(Math.min(...videos.map((video) => new Date(video.endTime).getTime())) + config.VIDEO_RETENTION_HOURS * 60 * 60 * 1000)
    }

    private static signedTtl(start: Date, end: Date) {
        return Math.max(60, Math.ceil((end.getTime() - start.getTime()) / 1000) + config.APPOINTMENT_MERGE_URL_EXTRA_SECONDS)
    }

    private static bounds(start: Date, end: Date) {
        return {
            startTime: new Date(start).toISOString(),
            endTime: new Date(end).toISOString(),
        }
    }

    private static async playbackStartOf(sourceIds: number[], fallback: Date): Promise<string> {
        const stored = await this.videos.findByIds(sourceIds)
        const byId = new Map(stored.map((video) => [video.id, video]))
        for (const id of sourceIds) {
            const video = byId.get(id)
            if (video) return new Date(video.startTime).toISOString()
        }
        return new Date(fallback).toISOString()
    }

    private static async readyFromSource(video: IVideo, start: Date, end: Date): Promise<AppointmentRenderResponse> {
        const expiresIn = this.signedTtl(start, end)
        return {
            status: "ready",
            videoUrl: await B2Service.getDownloadUrl(video.b2FilePath, expiresIn),
            urlExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
            ...this.bounds(start, end),
            playbackStartTime: new Date(video.startTime).toISOString(),
        }
    }

    private static async readyFromJob(job: IAppointmentVideoJob, start: Date, end: Date): Promise<AppointmentRenderResponse> {
        const expiresIn = this.signedTtl(start, end)
        return {
            status: "ready",
            jobId: job.publicId,
            videoUrl: await B2Service.getDownloadUrl(job.b2FilePath!, expiresIn),
            urlExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
            ...this.bounds(start, end),
            playbackStartTime: await this.playbackStartOf(job.sourceVideoIds, start),
        }
    }

    private static progressResponse(job: IAppointmentVideoJob): AppointmentRenderResponse {
        const status = job.status === "processing" || job.status === "deleting" ? "processing" : "queued"
        return { status, jobId: job.publicId!, pollAfterMs: POLL_AFTER_MS }
    }

    private static async fallbackForJob(job: IAppointmentVideoJob): Promise<AppointmentRenderResponse> {
        const stored = await this.videos.findByIds(job.sourceVideoIds)
        const available = stored.filter((video) => video.status === "available" && video.expiresAt && video.expiresAt.getTime() > Date.now())
        if (!available.length) return { status: "not_found" }
        const reason = job.errorCode === "INCOMPLETE_SOURCES" || job.errorCode === "NO_SOURCES" ? "incomplete_sources" : "merge_failed"
        return {
            status: "fallback",
            reason,
            jobId: job.publicId,
            ...this.bounds(job.appointmentStart, job.appointmentEnd),
            parts: await this.signParts(available.sort((left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime())),
        }
    }
}
