import { v2 as cloudinary } from "cloudinary"
import { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME } from "../config/config"

cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET
})

export class CloudinaryService {
    static async uploadImageAndGetUrl(buffer: Buffer, folder: string, publicId: string): Promise<{ url: string; publicId: string }> {
        return new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream({
                folder,
                public_id: publicId,
                resource_type: "image",
                overwrite: true,
            }, (error, result) => {
                if (error) {
                    return reject(new Error(`Error al subir archivo a Cloudinary: ${error.message}`));
                }
                if (!result || !result.secure_url || !result.public_id) {
                    return reject(new Error("Error al obtener la URL del archivo subido a Cloudinary"));
                }
                resolve({ url: result.secure_url, publicId: result.public_id });
            }).end(buffer)
        })
    }

    static async deleteImage(publicId: string): Promise<void> {
        try {
            await cloudinary.uploader.destroy(publicId);
        } catch (error: any) {
            throw new Error(`Error al eliminar archivo de Cloudinary: ${error.message}`);
        }
    }
}