import { User } from "../../../src/models/User"
import { UserService } from "../../../src/services/UserService"

test("debería eliminar un usuario correctamente", async () => {
    const user = new User("Héctor Hugo", "example@email.com", "encryptedPassword123")
    const savedUser = await UserService.createUser(user)

    const deletionResult = await UserService.deleteUser(savedUser.id!)
    expect(deletionResult).toBe(true)
    const fetchedUser = await UserService.findUserById(savedUser.id!)
    expect(fetchedUser).toBeNull()
})