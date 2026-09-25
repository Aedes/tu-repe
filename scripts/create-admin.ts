import { HashingService } from "../src/services/HashingService"
import { TotpService } from "../src/services/TotpService"
import { pool } from "../src/config/db"
import { generatePublicId } from "../src/utils/publicId"

const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD
const name = process.env.ADMIN_NAME || "Administrador"

const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/

async function main() {
    if (!email || !password) {
        throw new Error("Definí ADMIN_EMAIL y ADMIN_PASSWORD")
    }
    if (!strong.test(password)) {
        throw new Error("La contraseña debe tener 12+ caracteres, mayúscula, minúscula y número")
    }

    const [existing] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email.toLowerCase()])
    if ((existing as unknown[]).length) {
        console.log("El administrador ya existe. No se muestra un nuevo secreto TOTP.")
        process.exit(0)
    }

    const passwordHash = await HashingService.hashPassword(password)
    const totpSecret = TotpService.generateSecret()
    const uri = TotpService.keyUri(email, totpSecret)
    const encrypted = TotpService.encrypt(totpSecret)

    await pool.query(
        `INSERT INTO users (public_id, email, password_hash, name, system_role, is_active, token_version, totp_secret, totp_enabled)
         VALUES (?, ?, ?, ?, 'ADMIN', 1, 0, ?, 1)`,
        [generatePublicId(), email.toLowerCase(), passwordHash, name, encrypted]
    )

    console.log("Administrador creado. Guardá este secreto TOTP ahora; no se volverá a mostrar.")
    console.log(`OTPAuth URI: ${uri}`)
    console.log(`Secret: ${totpSecret}`)
    process.exit(0)
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
})
