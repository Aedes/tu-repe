import crypto from "crypto"

export const generateUrlId = () => crypto.randomBytes(6).toString("hex")
