import bcrypt from "bcrypt"

export class HashingService {
    static hashPassword(plainPassword: string): Promise<string> {
        return bcrypt.hash(plainPassword, 10)
    }

    static comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
        return bcrypt.compare(plainPassword, hashedPassword)
    }
}