import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authAdmin = (req: Request, res: Response, next: NextFunction): void | Response => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ message: "No autorizado" });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

        if (decoded.role !== "admin") {
            return res.status(403).json({ message: "Acceso denegado" });
        }

        next();
    } catch {
        return res.status(401).json({ message: "Token inválido" });
    }
}
