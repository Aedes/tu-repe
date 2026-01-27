import { User } from "../../../src/models/User"
import { UserService } from "../../../src/services/UserService"

describe("obtención de users", () => {
    test("debería obtener un usuario por su ID", async () => {
        const user = new User("Héctor Hugo", "example@email.com", "encryptedPassword123")
        const savedUser = await UserService.createUser(user)

        const fetchedUser = await UserService.findUserById(savedUser.id!)
        expect(fetchedUser).not.toBeNull()
        expect(fetchedUser!.id).toBe(savedUser.id)
        expect(fetchedUser!.name).toBe(savedUser.name)
        expect(fetchedUser!.email).toBe(savedUser.email)
        expect(fetchedUser!.passwordHash).toBe(savedUser.passwordHash)
    })

    test("debería obtener todos los usuarios", async () => {
        const user1 = new User("Héctor Hugo", "example1@email.com", "encryptedPassword123")
        const user2 = new User("Victor Hugo", "example2@email.com", "encryptedPassword123")

        const savedUser1 = await UserService.createUser(user1)
        const savedUser2 = await UserService.createUser(user2)

        const allUsers = await UserService.getAllUsers()
        expect(allUsers.length).toBeGreaterThanOrEqual(2)
        const fetchedUser1 = allUsers.find(u => u.id === savedUser1.id)
        const fetchedUser2 = allUsers.find(u => u.id === savedUser2.id)
        expect(fetchedUser1).toBeDefined()
        expect(fetchedUser2).toBeDefined()
    })

    test("debería obtener un usuario por su email", async () => {
        const user = new User("Héctor Hugo", "example@email.com", "encryptedPassword123")
        const savedUser = await UserService.createUser(user)

        const fetchedUser = await UserService.findUserByEmail(savedUser.email!)
        expect(fetchedUser).not.toBeNull()
        expect(fetchedUser!.id).toBe(savedUser.id)
        expect(fetchedUser!.name).toBe(savedUser.name)
        expect(fetchedUser!.email).toBe(savedUser.email)
        expect(fetchedUser!.passwordHash).toBe(savedUser.passwordHash)
    })
})