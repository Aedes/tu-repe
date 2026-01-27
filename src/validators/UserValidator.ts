import { BaseValidator } from "./BaseValidator";

export class UserValidator extends BaseValidator {
    static validate(data: any): void {
        this.validateRequired(data.name, 'name');
        this.validateNonEmptyString(data.name, 'name');

        this.validateRequired(data.email, 'email');
        this.validateString(data.email, 'email');

        this.validateRequired(data.passwordHash, 'passwordHash');
        this.validateNonEmptyString(data.passwordHash, 'passwordHash');
    }
}