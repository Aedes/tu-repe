import {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3"
import { Upload } from "@aws-sdk/lib-storage"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import fs from "fs"
import { Readable } from "stream"
import { pipeline } from "stream/promises"
import { config } from "../config/config"

const client = new S3Client({
    region: config.B2_REGION,
    endpoint: config.B2_ENDPOINT,
    credentials: {
        accessKeyId: config.B2_APPLICATION_KEY_ID,
        secretAccessKey: config.B2_APPLICATION_KEY,
    },
    forcePathStyle: true,
})

export class B2Service {
    static async uploadFileAndGetFilePath(localFilePath: string, clubId: number, courtId: number, fileName: string): Promise<string> {
        if (!fs.existsSync(localFilePath)) {
            throw new Error(`El archivo no existe: ${localFilePath}`)
        }
        const b2FilePath = `club_${clubId}/court_${courtId}/${fileName}`
        return this.uploadFile(localFilePath, b2FilePath)
    }

    static async uploadFile(localFilePath: string, b2FilePath: string, contentType = "video/mp4"): Promise<string> {
        if (!fs.existsSync(localFilePath)) {
            throw new Error(`El archivo no existe: ${localFilePath}`)
        }
        const upload = new Upload({
            client,
            params: {
                Bucket: config.B2_BUCKET_NAME,
                Key: b2FilePath,
                Body: fs.createReadStream(localFilePath),
                ContentType: contentType,
            },
            queueSize: 2,
            partSize: 8 * 1024 * 1024,
            leavePartsOnError: false,
        })
        await upload.done()
        return b2FilePath
    }

    static async downloadToFile(b2FilePath: string, destination: string): Promise<void> {
        const response = await client.send(new GetObjectCommand({
            Bucket: config.B2_BUCKET_NAME,
            Key: b2FilePath,
        }))
        if (!response.Body) throw new Error(`Objeto vacío: ${b2FilePath}`)
        await pipeline(response.Body as Readable, fs.createWriteStream(destination))
    }

    static async getObjectSize(b2FilePath: string): Promise<number> {
        const head = await client.send(new HeadObjectCommand({
            Bucket: config.B2_BUCKET_NAME,
            Key: b2FilePath,
        }))
        return head.ContentLength || 0
    }

    static async getDownloadUrl(b2FilePath: string, expiresIn = 5 * 60, downloadName?: string): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: config.B2_BUCKET_NAME,
            Key: b2FilePath,
            ...(downloadName ? { ResponseContentDisposition: `attachment; filename="${downloadName}"` } : {}),
        })
        return getSignedUrl(client, command, { expiresIn })
    }

    static async deleteObject(b2FilePath: string): Promise<void> {
        await client.send(new DeleteObjectCommand({
            Bucket: config.B2_BUCKET_NAME,
            Key: b2FilePath,
        }))
    }

    static async objectExists(b2FilePath: string): Promise<boolean> {
        try {
            await client.send(new HeadObjectCommand({
                Bucket: config.B2_BUCKET_NAME,
                Key: b2FilePath,
            }))
            return true
        } catch {
            return false
        }
    }
}
