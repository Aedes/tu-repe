import { BaseValidator } from "./BaseValidator";

export class VideoValidator extends BaseValidator {
    static validate(data: any): void {
        this.validateRequired(data.courtId, 'courtId');
        this.validateNumber(data.courtId, 'courtId');

        this.validateRequired(data.fileName, 'fileName');
        this.validateNonEmptyString(data.fileName, 'fileName');

        this.validateRequired(data.startTime, 'startTime');
        this.validateDate(data.startTime, 'startTime');

        this.validateRequired(data.endTime, 'endTime');
        this.validateDate(data.endTime, 'endTime');

        this.validateRequired(data.b2Url, 'b2Url');
        this.validateNonEmptyString(data.b2Url, 'b2Url');
    }
}