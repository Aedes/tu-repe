import bcrypt from "bcrypt"

export class HashingService {
    static hashPassword(plainPassword: string): Promise<string> {
        const rounds = process.env.NODE_ENV === "test" ? 4 : 12
        return bcrypt.hash(plainPassword, rounds)
    }

    static comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
        return bcrypt.compare(plainPassword, hashedPassword)
    }
}
