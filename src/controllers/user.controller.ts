import { Request, Response } from "express"
import { HashingService } from "../services/HashingService"
import { UserService } from "../services/UserService"
import { User } from "../models/User"
import { mapPublicId, mapPublicIdArray } from "../utils/publicIdResponse"

const mapClubsWithCourts = (clubs: any[]) =>
    clubs.map(club => ({
        ...mapPublicId(club),
        courts: club.courts ? mapPublicIdArray(club.courts) : []
    }))

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
            id: newUser.publicId,
            name: newUser.name,
            email: newUser.email
        })
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const assingOwnerToClub = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const { userId: userPublicId, clubId: clubPublicId } = req.body
        if (!userPublicId || !clubPublicId) return res.status(400).json({ message: "Faltan parámetros" })

        const clubAssigned = await UserService.assignOwnerToClubByPublicId(String(userPublicId), String(clubPublicId))

        if (!clubAssigned) return res.status(400).json({ message: "Error asignando relación" })

        return res.status(200).json({ clubAssigned: mapPublicId(clubAssigned) })
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const unassingOwnerToClub = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const { userId: userPublicId, clubId: clubPublicId } = req.body
        if (!userPublicId || !clubPublicId) return res.status(400).json({ message: "Faltan parámetros" })

        const clubUnassigned = await UserService.unassignOwnerByPublicId(String(userPublicId), String(clubPublicId))

        if (!clubUnassigned) return res.status(400).json({ message: "Error desasignando relación" })

        return res.status(200).json({ clubUnassigned: mapPublicId(clubUnassigned) })
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const getAllUsersWithCourts = async (_req: Request, res: Response): Promise<void | Response> => {
    try {
        const users = await UserService.getAllUsersWithClubs()
        const mappedUsers = users.map(user => ({
            id: user.publicId,
            name: user.name,
            email: user.email,
            clubs: user.clubs ? mapClubsWithCourts(user.clubs) : []
        }))
        return res.status(200).json(mappedUsers)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const getUserWithClubs = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const user = await UserService.getUserWithClubs(req.user?.id!)
        const mappedUser = {
            id: user.publicId,
            name: user.name,
            email: user.email,
            clubs: user.clubs ? mapClubsWithCourts(user.clubs) : []
        }
        return res.status(200).json(mappedUser)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const updateUser = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const userPublicId = req.params.id
        const { name, email } = req.body

        const updatedUser = await UserService.updateUserByPublicId(userPublicId, { name, email })

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" })
        }

        return res.status(200).json({
            id: updatedUser.publicId,
            name: updatedUser.name,
            email: updatedUser.email,
        })
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

export const deleteUser = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        const userPublicId = req.params.id
        const deleted = await UserService.deleteUserByPublicId(userPublicId)

        if (!deleted) {
            return res.status(404).json({ message: "User not found" })
        }

        return res.status(200).json({ message: "User deleted successfully" })
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}
