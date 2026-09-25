import { B2Service } from "../../../src/services/B2Service"

test.skip("conexión real B2 es opt-in (suite externa)", async () => {
    expect(typeof B2Service.getDownloadUrl).toBe("function")
})
