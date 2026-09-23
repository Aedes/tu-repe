import { Request, Response } from "express"
import { AuthService } from "../services/AuthService"
import { UserService } from "../services/UserService"
import { AppError } from "../errors/AppError"

export const loginAdmin = async (req: Request, res: Response) => {
    const { email, password, totp } = req.body
    const user = await AuthService.loginAdmin(email, password, totp, res)
    res.status(200).json(user)
}

export const loginUser = async (req: Request, res: Response) => {
    const { email, password } = req.body
    const user = await AuthService.loginUser(email, password, res)
    res.status(200).json(user)
}

export const checkAdmin = async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized()
    res.status(200).json({
        isAdmin: true,
        message: "Admin is logged in",
        user: { id: req.user.publicId, role: "admin" },
    })
}

export const checkUser = async (req: Request, res: Response) => {
    if (!req.user?.id) throw AppError.unauthorized()
    const user = await UserService.findUserById(req.user.id)
    if (!user) throw AppError.unauthorized()
    res.status(200).json({
        isAdmin: false,
        message: "User is logged in",
        user: { id: user.publicId, name: user.name, email: user.email, role: "user" },
    })
}

export const logoutAdmin = async (req: Request, res: Response) => {
    await AuthService.logout("admin", req.user?.id, res)
    res.status(200).json({ ok: true })
}

export const logoutUser = async (req: Request, res: Response) => {
    await AuthService.logout("user", req.user?.id, res)
    res.status(200).json({ ok: true })
}

export const csrfToken = async (req: Request, res: Response) => {
    res.status(200).json({ csrfToken: req.csrfToken })
}
