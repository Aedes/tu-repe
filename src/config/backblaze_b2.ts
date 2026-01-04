import B2 from "backblaze-b2"
import { B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY } from "./config"

export const b2 = new B2({
    applicationKeyId: B2_APPLICATION_KEY_ID,
    applicationKey: B2_APPLICATION_KEY,
})
