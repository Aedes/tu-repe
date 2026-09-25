import request from "supertest"
import { app } from "../../src/app"
import { UserService } from "../../src/services/UserService"
import { HashingService } from "../../src/services/HashingService"
import { TotpService } from "../../src/services/TotpService"
import { signAuthToken } from "../../src/middlewares/auth.middleware"
import { CSRF_COOKIE } from "../../src/middlewares/csrf.middleware"

export const api = () => request(app)

export const csrfPair = () => {
    const token = "test-csrf-token"
    return { cookie: `${CSRF_COOKIE}=${token}`, header: token }
}

export async function seedAdmin() {
    const totpSecret = TotpService.generateSecret()
    const user = await UserService.createUser({
        name: "Admin Test",
        email: `admin-${Date.now()}@test.local`,
        passwordHash: await HashingService.hashPassword("AdminPassw0rd!x"),
        systemRole: "ADMIN",
        isActive: true,
        tokenVersion: 0,
        totpEnabled: true,
        totpSecret: TotpService.encrypt(totpSecret),
    })
    const token = signAuthToken({
        sub: user.publicId!,
        role: "admin",
        tokenVersion: 0,
    }, "1h")
    const csrf = csrfPair()
    return { user, token, totpSecret, cookie: `tu_repe_admin=${token}; ${csrf.cookie}`, csrf }
}

export async function seedUser() {
    const user = await UserService.createUser({
        name: "User Test",
        email: `user-${Date.now()}@test.local`,
        passwordHash: await HashingService.hashPassword("UserPassw0rd!x"),
        systemRole: "USER",
        isActive: true,
        tokenVersion: 0,
        totpEnabled: false,
    })
    const token = signAuthToken({
        sub: user.publicId!,
        role: "user",
        tokenVersion: 0,
    }, "1h")
    const csrf = csrfPair()
    return { user, token, cookie: `tu_repe_user=${token}; ${csrf.cookie}`, csrf }
}

export const generateAdminToken = async () => {
    const seeded = await seedAdmin()
    return seeded.token
}
