import crypto from "crypto"
import { authenticator } from "otplib"
import { config } from "../config/config"

const key = crypto.createHash("sha256").update(config.JWT_SECRET).digest()

export class TotpService {
    static generateSecret() {
        return authenticator.generateSecret()
    }

    static keyUri(email: string, secret: string) {
        return authenticator.keyuri(email, "Tu Repe", secret)
    }

    static encrypt(secret: string) {
        const iv = crypto.randomBytes(12)
        const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
        const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()])
        const tag = cipher.getAuthTag()
        return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`
    }

    static decrypt(payload: string) {
        const [ivHex, tagHex, dataHex] = payload.split(":")
        const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"))
        decipher.setAuthTag(Buffer.from(tagHex, "hex"))
        return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8")
    }

    static verify(token: string, encryptedSecret: string) {
        const secret = this.decrypt(encryptedSecret)
        return authenticator.check(token, secret)
    }
}
