import { ICourt } from "../types";
import { CourtValidator } from "../validators/CourtValidator";

export class Court implements ICourt {
    constructor(
        readonly clubId: number,
        readonly name: string,
        readonly cameraHost: string,
        readonly cameraPath: string,
        readonly streamKey: string,
        readonly id?: number
    ) {
        CourtValidator.validate({
            clubId,
            name,
            cameraHost,
            cameraPath,
            streamKey
        })
    }
}