import request from "supertest";
import path from "path";

describe("POST /clips/convert", () => {
    test("convierte un clip y devuelve mp4", async () => {
        const response = await request("http://localhost:5000")
            .post("/clips/convert")
            .attach("clip", path.join(__dirname, "fixtures/test.webm"));

        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toContain("application/mp4");
        expect(response.body).toBeInstanceOf(Object);
    });
});
