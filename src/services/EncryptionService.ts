import crypto from "crypto"
import { ENCRYPTION_PASSWORD } from "../config/config"

export class EncryptionService {
    private static readonly algorithm = 'aes-256-cbc'
    private static readonly key = crypto.scryptSync(ENCRYPTION_PASSWORD, 'salt', 32)
    private static readonly iv = Buffer.alloc(16, 0)

    static encrypt(text: string): string {
        const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv)
        let encrypted = cipher.update(text, 'utf8', 'hex')
        encrypted += cipher.final('hex')
        return encrypted
    }

    static decrypt(encryptedText: string): string {
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv)
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
        decrypted += decipher.final('utf8')
        return decrypted
    }
}