import { Request, Response } from "express"
import { HashingService } from "../services/HashingService"
import { UserService } from "../services/UserService"
import { toOwnerClubWithCourts, toPublicClub, toPublicUser } from "../dto/responseDtos"
import { AppError } from "../errors/AppError"

export const createUser = async (req: Request, res: Response) => {
    const existing = await UserService.findUserByEmail(req.body.email)
    if (existing) throw AppError.badRequest("A user with that email already exists.")
    const hashedPassword = await HashingService.hashPassword(req.body.password)
    const newUser = await UserService.createUser({
        name: req.body.name,
        email: req.body.email.toLowerCase(),
        passwordHash: hashedPassword,
        systemRole: "USER",
        isActive: true,
        tokenVersion: 0,
        totpEnabled: false,
    })
    res.status(201).json(toPublicUser(newUser))
}

export const assingOwnerToClub = async (req: Request, res: Response) => {
    const clubAssigned = await UserService.assignOwnerToClubByPublicId(req.body.userId, req.body.clubId)
    res.status(200).json({ clubAssigned: toPublicClub(clubAssigned) })
}

export const unassingOwnerToClub = async (req: Request, res: Response) => {
    const clubUnassigned = await UserService.unassignOwnerByPublicId(req.body.userId, req.body.clubId)
    res.status(200).json({ clubUnassigned: toPublicClub(clubUnassigned) })
}

export const getAllUsersWithCourts = async (_req: Request, res: Response) => {
    const users = await UserService.getAllUsersWithClubs()
    res.status(200).json(users.map((user) => ({
        ...toPublicUser(user),
        clubs: (user.clubs || []).map(toPublicClub),
    })))
}

export const getUserWithClubs = async (req: Request, res: Response) => {
    if (!req.user?.id) throw AppError.unauthorized()
    const user = await UserService.getUserWithClubs(req.user.id)
    res.status(200).json({
        ...toPublicUser(user),
        clubs: (user.clubs || []).map(toOwnerClubWithCourts),
    })
}

export const updateUser = async (req: Request, res: Response) => {
    const updated = await UserService.updateUserByPublicId(req.params.id, req.body)
    if (!updated) throw AppError.notFound("User not found")
    res.status(200).json(toPublicUser(updated))
}

export const deleteUser = async (req: Request, res: Response) => {
    const deleted = await UserService.deleteUserByPublicId(req.params.id)
    if (!deleted) throw AppError.notFound("User not found")
    res.status(200).json({ message: "User deleted successfully" })
}
