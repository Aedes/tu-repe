import request from "supertest";
import { app } from "../../src/app";
import { generateAdminToken } from "../helpers/generateToken";

describe("Auth middleware", () => {
    test("debe permitir acceso con token válido", async () => {
        const token = await generateAdminToken()

        const res = await request(app)
            .get("/auth/admin/check-admin")
            .set("Authorization", `Bearer ${token}`)
            .set("Cookie", "tu_repe_csrf=test-csrf-token")
            .set("X-CSRF-Token", "test-csrf-token");

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("isAdmin", true);
    })

    test("debe rechazar si no hay token", async () => {
        const res = await request(app)
            .get("/auth/admin/check-admin");

        expect(res.status).toBe(401);
    });

    test("debe rechazar token inválido", async () => {
        const res = await request(app)
            .get("/auth/admin/check-admin")
            .set("Authorization", "Bearer token_falso");

        expect(res.status).toBe(401);
    });
});
