import { ICourt } from "../types";
import { CourtValidator } from "../validators/CourtValidator";

export class Court implements ICourt {
    constructor(
        readonly clubId: number,
        readonly name: string,
        readonly cameraHost: string,
        readonly cameraPort: number,
        readonly cameraPath: string,
        readonly rtspUsername: string,
        readonly rtspPasswordEncrypted: string,
        readonly id?: number
    ) {
        CourtValidator.validate({
            clubId,
            name,
            cameraHost,
            cameraPort,
            cameraPath,
            rtspUsername,
            rtspPasswordEncrypted
        })
    }
}