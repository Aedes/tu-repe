import fs from "fs"
import path from "path"
import { B2Service } from "../../../src/services/B2Service"
import { config } from "../../../src/config/config"
import { Upload } from "@aws-sdk/lib-storage"

jest.mock("@aws-sdk/lib-storage", () => ({
    Upload: jest.fn().mockImplementation((options) => ({
        done: jest.fn(() => new Promise<void>((resolve, reject) => {
            options.params.Body.once("open", () => {
                options.params.Body.destroy()
                resolve()
            })
            options.params.Body.once("error", reject)
        })),
    })),
}))

test("debería preparar la subida a B2 y devolver el b2FilePath", async () => {
    fs.mkdirSync(config.UPLOAD_DIR, { recursive: true })
    const videoFilePath = path.join(config.UPLOAD_DIR, "video.mp4")
    fs.writeFileSync(videoFilePath, "Contenido de prueba")

    try {
        const b2FilePath = await B2Service.uploadFileAndGetFilePath(videoFilePath, 1, 2, "video.mp4")

        expect(b2FilePath).toBe("club_1/court_2/video.mp4")
        expect(Upload).toHaveBeenCalledWith(expect.objectContaining({
            params: expect.objectContaining({
                Bucket: config.B2_BUCKET_NAME,
                Key: b2FilePath,
            }),
        }))
    } finally {
        fs.rmSync(videoFilePath, { force: true })
    }
})
