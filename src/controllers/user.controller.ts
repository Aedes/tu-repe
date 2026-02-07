import { Request, Response } from "express"
import { HashingService } from "../services/HashingService"
import { UserService } from "../services/UserService"
import { User } from "../models/User"

export const createUser = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const { name, email, password } = req.body

        const userWithEmail = await UserService.findUserByEmail(email)

        if (userWithEmail) {
            return res.status(400).json({ message: "A user with that email already exists." })
        }

        const hashedPassword = await HashingService.hashPassword(password)
        const user = new User(name, email, hashedPassword)
        const newUser = await UserService.createUser(user)

        if (!newUser) {
            return res.status(400).json({ message: "Error creating user" })
        }

        return res.status(201).json({
            id: newUser.id,
            publicId: newUser.publicId,
            name: newUser.name,
            email: newUser.email
        })
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const assingOwnerToClub = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const { userId, clubId } = req.body
        if (!userId || !clubId) return res.status(400).json({ message: "Faltan parámetros" })

        const clubAssigned = await UserService.assignOwnerToClub(parseInt(userId, 10), parseInt(clubId, 10))

        if (!clubAssigned) return res.status(400).json({ message: "Error asignando relación" })

        return res.status(200).json({ clubAssigned })
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const unassingOwnerToClub = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const { userId, clubId } = req.body
        if (!userId || !clubId) return res.status(400).json({ message: "Faltan parámetros" })

        const clubUnassigned = await UserService.unassingOwner(parseInt(userId, 10), parseInt(clubId, 10))

        if (!clubUnassigned) return res.status(400).json({ message: "Error desasignando relación" })

        return res.status(200).json({ clubUnassigned })
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const getAllUsersWithCourts = async (_req: Request, res: Response): Promise<void | Response> => {
    try {
        const users = await UserService.getAllUsersWithClubs()
        return res.status(200).json(users)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const getUserWithClubs = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const user = await UserService.getUserWithClubs(req.user?.id!)
        return res.status(200).json(user)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const updateUser = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const userId = parseInt(req.params.id, 10)
        const { name, email } = req.body

        const updatedUser = await UserService.updateUser(userId, { name, email })

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" })
        }

        return res.status(200).json({
            id: updatedUser.id,
            publicId: updatedUser.publicId,
            name: updatedUser.name,
            email: updatedUser.email,
        })
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const deleteUser = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const userId = parseInt(req.params.id, 10)
        const deleted = await UserService.deleteUser(userId)

        if (!deleted) {
            return res.status(404).json({ message: "User not found" })
        }

        return res.status(200).json({ message: "User deleted successfully" })
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}
