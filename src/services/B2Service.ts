import { b2 } from "../config/backblaze_b2";
import { B2_BUCKET_ID } from "../config/config";
import fs from "fs";

export class B2Service {
    static async uploadFileAndGetFilePath(localFilePath: string, clubId: number, courtId: number, fileName: string): Promise<string> {
        try {
            if (!fs.existsSync(localFilePath)) {
                throw new Error(`El archivo no existe: ${localFilePath}`);
            }

            const authResponse = await b2.authorize();

            if (!authResponse.data || !authResponse.data.downloadUrl) {
                throw new Error("No se pudo autorizar con B2 o obtener la URL de descarga");
            }

            const { data: uploadData } = await b2.getUploadUrl({
                bucketId: B2_BUCKET_ID
            });

            if (!uploadData.uploadUrl || !uploadData.authorizationToken) {
                throw new Error("No se pudo obtener la URL de subida de B2");
            }

            const b2FilePath = `club_${clubId}/court_${courtId}/${fileName}`;

            const fileData = fs.readFileSync(localFilePath);
            const fileSize = fs.statSync(localFilePath).size;

            const uploadResponse = await b2.uploadFile({
                uploadUrl: uploadData.uploadUrl,
                uploadAuthToken: uploadData.authorizationToken,
                fileName: b2FilePath,
                data: fileData,
                mime: "video/mp4",
                contentLength: fileSize
            });

            if (!uploadResponse.data || !uploadResponse.data.fileId) {
                throw new Error("Error al subir el archivo a B2");
            }

            fs.unlinkSync(localFilePath);

            return b2FilePath;
        } catch (error: any) {
            throw new Error(`Error al subir archivo a B2: ${error.message}`);
        }
    }

    static async getFileUrl(b2FilePath: string): Promise<string> {
        try {
            const authResponse = await b2.authorize();

            if (!authResponse.data || !authResponse.data.downloadUrl) {
                throw new Error("No se pudo autorizar con B2 o obtener la URL de descarga");
            }

            const { data } = await b2.getDownloadAuthorization({
                bucketId: B2_BUCKET_ID,
                fileNamePrefix: b2FilePath,
                validDurationInSeconds: 60 * 15
            })

            const downloadUrl = `${authResponse.data.downloadUrl}/file/${B2_BUCKET_ID}/${b2FilePath}?Authorization=${data.authorizationToken}`;

            return downloadUrl;
        } catch (error: any) {
            throw new Error(`Error al obtener la URL del archivo en B2: ${error.message}`);
        }
    }
}