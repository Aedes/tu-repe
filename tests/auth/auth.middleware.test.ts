import request from "supertest";
import { generateAdminToken } from "../helpers/generateToken";

describe("Auth middleware", () => {
    test("debe permitir acceso con token válido", async () => {
        const token = generateAdminToken()

        const res = await request("http://localhost:5000")
            .get("/auth/admin/check-admin")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("isAdmin", true);
    })

    test("debe rechazar si no hay token", async () => {
        const res = await request("http://localhost:5000")
            .get("/auth/admin/check-admin");

        expect(res.status).toBe(401);
    });

    test("debe rechazar token inválido", async () => {
        const res = await request("http://localhost:5000")
            .get("/auth/admin/check-admin")
            .set("Authorization", "Bearer token_falso");

        expect(res.status).toBe(401);
    });
});
