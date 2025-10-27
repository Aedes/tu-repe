import { ICourt } from "../types";
import { CourtValidator } from "../validators/CourtValidator";

export class Court implements ICourt {
    constructor(
        readonly clubId: number,
        readonly name: string,
        readonly rtspUrl: string,
        readonly id?: number
    ) {
        CourtValidator.validate({ clubId, name, rtspUrl })
    }
}