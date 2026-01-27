import { User } from "../../../src/models/User";
import { UserService } from "../../../src/services/UserService";

test("debería persistir un usuario en la base de datos", async () => {
    const user = new User("Héctor Hugo", "example@email.com", "encryptedPassword123")
    const savedUser = await UserService.createUser(user)

    expect(savedUser.id).toBeDefined()
    expect(savedUser.name).toBe("Héctor Hugo")
    expect(savedUser.email).toBe("example@email.com")
    expect(savedUser.passwordHash).toBe("encryptedPassword123")
})