import { Request, Response } from "express"
import jwt from "jsonwebtoken"
import { ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET } from "../config/config";
import { UserService } from "../services/UserService";

export const loginAdmin = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const { email, password } = req.body;
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            const token = jwt.sign(
                { role: "admin" },
                JWT_SECRET as string,
                { expiresIn: "2h" }
            )
            return res.status(200).json({ token });
        } else {
            return res.status(401).json({ message: "Invalid credentials" });
        }
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
}

export const checkAdmin = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ message: "No autorizado" });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, JWT_SECRET as string) as any;

        if (decoded.role !== "admin") {
            return res.status(403).json({ message: "Acceso denegado" });
        }

        return res.status(200).json({ isAdmin: true, message: "Admin is logged in" });
    } catch {
        return res.status(401).json({ message: "Token inválido" });
    }
}

export const loginUser = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const { email, password } = req.body;

        const user = await UserService.findUserByEmail(email)

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const isPasswordValid = await UserService.comparePassword(password, user.passwordHash)

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { userId: user.id, role: "user" },
            JWT_SECRET as string,
            { expiresIn: "7d" }
        )

        return res.status(200).json({ token });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
}

export const checkUser = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ message: "No autorizado" });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, JWT_SECRET as string) as any;

        if (decoded.role !== "user") {
            return res.status(403).json({ message: "Acceso denegado" });
        }

        const user = await UserService.findUserById(decoded.userId)

        if (!user) {
            return res.status(403).json({ message: "Acceso denegado" });
        }

        return res.status(200).json({
            isAdmin: true, message: "User is logged in",
            user: {
                name: user.name,
                email: user.email
            }
        });
    } catch {
        return res.status(401).json({ message: "Token inválido" });
    }
}