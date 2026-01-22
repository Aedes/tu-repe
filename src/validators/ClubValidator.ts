import { BaseValidator } from "./BaseValidator";

export class ClubValidator extends BaseValidator {
    static validate(data: any): void {
        this.validateRequired(data.name, 'name');
        this.validateNonEmptyString(data.name, 'name');

        this.validateRequired(data.openTime, 'openTime');
        this.validateNonEmptyString(data.openTime, 'openTime');

        this.validateRequired(data.closeTime, 'closeTime');
        this.validateNonEmptyString(data.closeTime, 'closeTime');

        this.validateRequired(data.appointmentDuration, 'appointmentDuration');
        this.validateNumber(data.appointmentDuration, 'appointmentDuration');

        this.validateRequired(data.country, 'country');
        this.validateNonEmptyString(data.country, 'country');

        this.validateRequired(data.province, 'province');
        this.validateNonEmptyString(data.province, 'province');

        this.validateRequired(data.city, 'city');
        this.validateNonEmptyString(data.city, 'city');

        this.validateRequired(data.address, 'address');
        this.validateNonEmptyString(data.address, 'address');
    }
}