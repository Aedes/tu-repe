import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserService } from "../services/UserService";

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

export const authUser = (req: Request, res: Response, next: NextFunction): void | Response => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ message: "No autorizado" });
        }

        const token = authHeader.split(" ")[1];

        const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
            userId: number,
            role: string
        };

        if (payload.role !== "user") {
            return res.status(403).json({ message: "Acceso denegado" });
        }

        req.user = { id: payload.userId }

        next();
    } catch {
        return res.status(401).json({ message: "Token inválido" });
    }
}

export const requireOwnerOfClub = async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    const userId = req.user?.id;
    const clubId = req.params.id;

    if (!userId || !clubId) {
        return res.status(401).json({ message: "No autorizado" });
    }

    const isOwner = await UserService.requireOwnerOfClub(String(userId), clubId)

    if (!isOwner) {
        return res.status(401).json({ message: "No autorizado" });
    }

    next();
};

export const requireOwnerOfCourt = async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    const userId = req.user?.id;
    const courtId = req.params.id;

    if (!userId || !courtId) {
        return res.status(401).json({ message: "No autorizado" });
    }

    const isOwner = await UserService.requireOwnerOfCourt(String(userId), courtId)

    if (!isOwner) {
        return res.status(401).json({ message: "No autorizado" });
    }

    next();
};