import { VideoRepository } from "../repositories/VideoRepository"
import { DeletionJobRepository } from "../repositories/DeletionJobRepository"
import { B2Service } from "./B2Service"
import { logger } from "../logger"
import { IVideo } from "../types"

export class RetentionService {
    private static readonly videos = new VideoRepository()
    private static readonly jobs = new DeletionJobRepository()
    private static processing = false

    static async enqueueExpired() {
        const expired = await this.videos.findExpiredAvailable()
        for (const video of expired) {
            await this.enqueueVideo(video)
        }
        return expired.length
    }

    static async enqueueVideo(video: IVideo) {
        if (!video.id) return
        await this.videos.markDeleting(video.id)
        await this.jobs.enqueue({
            videoId: video.id,
            courtId: video.courtId,
            b2FilePath: video.b2FilePath,
        })
    }

    static async processNext(): Promise<boolean> {
        if (this.processing) return false
        const job = await this.jobs.claimNext()
        if (!job?.id) return false
        this.processing = true
        try {
            try {
                const exists = await B2Service.objectExists(job.b2FilePath)
                if (exists) {
                    await B2Service.deleteObject(job.b2FilePath)
                }
                if (job.videoId) {
                    await this.videos.markDeleted(job.videoId)
                }
                await this.jobs.markCompleted(job.id)
                return true
            } catch (error) {
                const attempts = job.attemptsCount + 1
                await this.jobs.markFailed(job.id, error instanceof Error ? error.message : "delete_failed", attempts)
                logger.error({ err: error, jobId: job.id }, "deletion_job_failed")
                return false
            }
        } finally {
            this.processing = false
        }
    }

    static async dryRun() {
        const expired = await this.videos.findExpiredAvailable()
        const pending = await this.jobs.findPending()
        return {
            expiredVideos: expired.map((video) => ({
                id: video.publicId,
                courtId: video.courtId,
                fileName: video.fileName,
                expiresAt: video.expiresAt,
                b2FilePath: video.b2FilePath,
            })),
            pendingJobs: pending.length,
        }
    }
}
