import { IUser } from "../types";
import { UserValidator } from "../validators/UserValidator";

export class User implements IUser {
    constructor(
        readonly name: string,
        readonly email: string,
        readonly passwordHash: string,
    ) {
        UserValidator.validate({
            name,
            email,
            passwordHash
        })
    }
}