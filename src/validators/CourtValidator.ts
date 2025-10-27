import { BaseValidator } from "./BaseValidator";

export class CourtValidator extends BaseValidator {
    static validate(data: any): void {
        this.validateRequired(data.clubId, 'clubId');
        this.validateNumber(data.clubId, 'clubId');

        this.validateRequired(data.name, 'name');
        this.validateNonEmptyString(data.name, 'name');

        this.validateRequired(data.rtspUrl, 'rtspUrl');
        this.validateNonEmptyString(data.rtspUrl, 'rtspUrl');
    }
}