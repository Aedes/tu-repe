import jwt from "jsonwebtoken"
import { JWT_SECRET } from "../../src/config/config";

export const generateAdminToken = () => {
    return jwt.sign(
        { role: "admin" },
        JWT_SECRET as string,
        { expiresIn: "1h" }
    );
}