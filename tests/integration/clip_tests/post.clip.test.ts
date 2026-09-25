import request from "supertest";
import { app } from "../../../src/app";
import path from "path";

describe("POST /clips/convert", () => {
    test("convierte un clip y devuelve mp4", async () => {
        const response = await request(app)
            .post("/clips/convert")
            .set("Cookie", "tu_repe_csrf=test-csrf-token")
            .set("X-CSRF-Token", "test-csrf-token")
            .attach("clip", path.join(__dirname, "fixtures/test.webm"));

        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toContain("application/mp4");
        expect(response.body).toBeInstanceOf(Object);
    });
});
