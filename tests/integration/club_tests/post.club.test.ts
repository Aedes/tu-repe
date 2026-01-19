import request from "supertest"
import { generateAdminToken } from "../../helpers/generateToken"

describe("POST Club routes", () => {
    test("POST /clubs - debería crear un club nuevo", async () => {
        const token = generateAdminToken()

        const res = await request("http://localhost:5000")
            .post("/clubs")
            .set("Authorization", `Bearer ${token}`)
            .send({
                name: "Club Integration Test",
                openTime: "07:00",
                closeTime: "23:00",
                appointmentDuration: 90
            })

        expect(res.status).toBe(201)
        expect(res.body).toHaveProperty("id")
        expect(res.body.name).toBe("Club Integration Test")
        expect(res.body.openTime).toEqual("07:00:00")
        expect(res.body.closeTime).toBe("23:00:00")
        expect(res.body.appointmentDuration).toBe(90)
    })
})