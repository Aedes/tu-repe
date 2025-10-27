export class BaseValidator {
    protected static validateRequired = (value: any, fildName: string): void => {
        if (value === null || value === undefined) {
            throw new Error(`Field ${fildName} is required`);
        }
    }

    protected static validateString = (value: any, fildName: string): void => {
        if (typeof value !== 'string') {
            throw new Error(`Field ${fildName} must be a string`);
        }
    }

    protected static validateNumber = (value: any, fildName: string): void => {
        if (typeof value !== 'number') {
            throw new Error(`Field ${fildName} must be a number`);
        }
    }

    protected static validateDate = (value: any, fildName: string): void => {
        if (!(value instanceof Date) || isNaN(value.getTime())) {
            throw new Error(`Field ${fildName} must be a valid date`);
        }
    }

    protected static validateNonEmptyString = (value: any, fildName: string): void => {
        this.validateString(value, fildName);
        if (value.trim().length === 0) {
            throw new Error(`Field ${fildName} must be a non-empty string`);
        }
    }
}