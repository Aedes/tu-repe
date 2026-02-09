import { IClub } from "../types";
import { ClubValidator } from "../validators/ClubValidator";

export class Club implements IClub {
    constructor(
        readonly name: string,
        readonly openTime: string,
        readonly closeTime: string,
        readonly appointmentDuration: number,
        readonly country: string,
        readonly province: string,
        readonly city: string,
        readonly address: string,
        readonly urlId: string,
        readonly phone?: string,
        readonly instagramHandle?: string,
        readonly description?: string,
        readonly profileImageUrl?: string,
        readonly coverImageUrl?: string,
        readonly profileImagePublicId?: string,
        readonly coverImagePublicId?: string,
        readonly id?: number
    ) {
        ClubValidator.validate({ name, openTime, closeTime, appointmentDuration, country, province, city, address, urlId })
    }
}