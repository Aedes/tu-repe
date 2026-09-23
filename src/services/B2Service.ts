import {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3"
import { Upload } from "@aws-sdk/lib-storage"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import fs from "fs"
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
        const upload = new Upload({
            client,
            params: {
                Bucket: config.B2_BUCKET_NAME,
                Key: b2FilePath,
                Body: fs.createReadStream(localFilePath),
                ContentType: "video/mp4",
            },
            queueSize: 2,
            partSize: 8 * 1024 * 1024,
            leavePartsOnError: false,
        })
        await upload.done()
        return b2FilePath
    }

    static async getDownloadUrl(b2FilePath: string): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: config.B2_BUCKET_NAME,
            Key: b2FilePath,
        })
        return getSignedUrl(client, command, { expiresIn: 5 * 60 })
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
