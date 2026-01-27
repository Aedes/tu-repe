import { User } from "../../../src/models/User";

test("debería crear una instancia de User correctamente", () => {
    const user = new User("Héctor Hugo", "example@email.com", "encryptedPassword123")
    expect(user.name).toBe("Héctor Hugo")
    expect(user.email).toBe("example@email.com")
    expect(user.passwordHash).toBe("encryptedPassword123")
})