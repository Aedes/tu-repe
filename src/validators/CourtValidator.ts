import { BaseValidator } from "./BaseValidator";

export class CourtValidator extends BaseValidator {
    static validate(data: any): void {
        this.validateRequired(data.clubId, 'clubId');
        this.validateNumber(data.clubId, 'clubId');

        this.validateRequired(data.name, 'name');
        this.validateNonEmptyString(data.name, 'name');

        this.validateRequired(data.cameraHost, 'cameraHost');
        this.validateNonEmptyString(data.cameraHost, 'cameraHost');

        this.validateRequired(data.cameraPath, 'cameraPath');
        this.validateNonEmptyString(data.cameraPath, 'cameraPath');

        this.validateRequired(data.streamKey, 'streamKey');
        this.validateNonEmptyString(data.streamKey, 'streamKey');
    }
}