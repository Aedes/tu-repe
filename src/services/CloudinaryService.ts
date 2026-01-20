import { v2 as cloudinary } from "cloudinary"
import { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME } from "../config/config"

cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET
})

export class CloudinaryService {
    static async uploadImageAndGetUrl(localFilePath: string, clubId: number): Promise<{ url: string; publicId: string }> {
        try {
            const cloudinaryFolder = `club_${clubId}`;
            const uploadResponse = await cloudinary.uploader.upload(localFilePath, {
                folder: cloudinaryFolder,
            });

            if (!uploadResponse || !uploadResponse.secure_url) {
                throw new Error("Error al subir el archivo a Cloudinary");
            }

            return {
                url: uploadResponse.secure_url,
                publicId: uploadResponse.public_id
            };
        } catch (error: any) {
            throw new Error(`Error al subir archivo a Cloudinary: ${error.message}`);
        }
    }

    static async deleteImage(publicId: string): Promise<void> {
        try {
            await cloudinary.uploader.destroy(publicId);
        } catch (error: any) {
            throw new Error(`Error al eliminar archivo de Cloudinary: ${error.message}`);
        }
    }
}