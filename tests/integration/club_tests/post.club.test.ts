import request from "supertest"
import { app } from "../../../src/app"
import { generateAdminToken } from "../../helpers/generateToken"

describe("POST Club routes", () => {
    test("POST /clubs - debería crear un club nuevo", async () => {
        const token = await generateAdminToken()

        const res = await request(app)
            .post("/clubs")
            .set("Authorization", `Bearer ${token}`)
            .set("Cookie", "tu_repe_csrf=test-csrf-token")
            .set("X-CSRF-Token", "test-csrf-token")
            .send({
                name: "Club Integration Test",
                openTime: "07:00",
                closeTime: "23:00",
                appointmentDuration: 90,
                country: "Argentina",
                province: "Mendoza",
                city: "San Rafael",
                address: "Comandante Salas 660"
            })

        expect(res.status).toBe(201)
        expect(res.body).toHaveProperty("id")
        expect(res.body.name).toBe("Club Integration Test")
        expect(res.body.openTime).toEqual("07:00:00")
        expect(res.body.closeTime).toBe("23:00:00")
        expect(res.body.appointmentDuration).toBe(90)
        expect(res.body.country).toBe("Argentina")
        expect(res.body.province).toBe("Mendoza")
        expect(res.body.city).toBe("San Rafael")
        expect(res.body.address).toBe("Comandante Salas 660")
    })
})