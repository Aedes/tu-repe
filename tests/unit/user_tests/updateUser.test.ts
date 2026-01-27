import { User } from "../../../src/models/User"
import { UserService } from "../../../src/services/UserService"

test("debería actualizar una cancha correctamente", async () => {
    const user = new User("Héctor Hugo", "example@email.com", "encryptedPassword123")
    const savedUser = await UserService.createUser(user)

    savedUser.name = "Víctor Hugo"
    savedUser.email = "updated@email.com"
    savedUser.passwordHash = "newEncryptedPassword456"

    const updatedUser = await UserService.updateUser(savedUser.id!, savedUser)

    expect(updatedUser?.name).toBe("Víctor Hugo")
    expect(updatedUser?.email).toBe("updated@email.com")
    expect(updatedUser?.passwordHash).toBe("newEncryptedPassword456")
})