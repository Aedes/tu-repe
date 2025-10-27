import { IClub } from "../types";
import { ClubValidator } from "../validators/ClubValidator";

export class Club implements IClub {
    constructor(
        readonly name: string,
        readonly openTime: string,
        readonly closeTime: string,
        readonly id?: number
    ) {
        ClubValidator.validate({ name, openTime, closeTime })
    }
}