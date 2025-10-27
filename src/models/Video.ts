import { IVideo } from "../types";
import { VideoValidator } from "../validators/VideoValidator";

export class Video implements IVideo {
    constructor(
        readonly courtId: number,
        readonly fileName: string,
        readonly startTime: Date,
        readonly endTime: Date,
        readonly b2Url: string,
        readonly id?: number
    ) {
        VideoValidator.validate({ courtId, fileName, startTime, endTime, b2Url })
    }
}