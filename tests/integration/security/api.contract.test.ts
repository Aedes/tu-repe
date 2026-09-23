import { api, seedAdmin, seedUser } from "../../helpers/generateToken"
import { ClubService } from "../../../src/services/ClubService"
import { CourtService } from "../../../src/services/CourtService"

describe("API contract hardening", () => {
    test("mutaciones anónimas dan 401", async () => {
        const res = await api().put("/courts/c/00000000-0000-4000-8000-000000000001").send({ name: "x" })
        expect([401, 403, 400]).toContain(res.status)
        expect(res.status).not.toBe(200)
    })

    test("GET /clubs/with-courts requiere admin", async () => {
        const res = await api().get("/clubs/with-courts")
        expect(res.status).toBe(401)
    })

    test("respuestas públicas no exponen secretos", async () => {
        const club = await ClubService.createClub({
            name: "Public Club",
            openTime: "08:00",
            closeTime: "22:00",
            appointmentDuration: 60,
            country: "Argentina",
            province: "Mendoza",
            city: "San Rafael",
            address: "Calle 1",
            urlId: "pubclub12ab",
        })
        await CourtService.createCourt({
            clubId: club.id!,
            name: "Cancha 1",
            cameraHost: "10.0.0.8",
            cameraPath: "club_1/secretkey",
            streamKey: "super-secret-stream",
        })
        const res = await api().get(`/clubs/c/${club.publicId}`)
        expect(res.status).toBe(200)
        const body = JSON.stringify(res.body)
        expect(body).not.toMatch(/streamKey|cameraPath|b2FilePath|passwordHash|totpSecret/i)
        expect(res.body.id).toBe(club.publicId)
    })

    test("admin ve canchas sin streamKey en listados", async () => {
        const admin = await seedAdmin()
        const club = await ClubService.createClub({
            name: "Admin Club",
            openTime: "08:00",
            closeTime: "22:00",
            appointmentDuration: 60,
            country: "Argentina",
            province: "Mendoza",
            city: "San Rafael",
            address: "Calle 1",
            urlId: "admclub12ab",
        })
        await CourtService.createCourt({
            clubId: club.id!,
            name: "Cancha 1",
            cameraHost: "10.0.0.8",
            cameraPath: "hidden",
            streamKey: "must-not-leak",
        })
        const res = await api().get("/clubs/with-courts").set("Cookie", admin.cookie)
        expect(res.status).toBe(200)
        expect(JSON.stringify(res.body)).not.toContain("must-not-leak")
    })

    test("dueño A no edita club B", async () => {
        const userA = await seedUser()
        const clubB = await ClubService.createClub({
            name: "Club B",
            openTime: "08:00",
            closeTime: "22:00",
            appointmentDuration: 60,
            country: "Argentina",
            province: "Mendoza",
            city: "San Rafael",
            address: "Calle 1",
            urlId: "clubbbbb12ab",
        })
        const res = await api()
            .put(`/users/c/${clubB.publicId}`)
            .set("Cookie", userA.cookie)
            .set("X-CSRF-Token", userA.csrf.header)
            .send({ name: "Hack" })
        expect(res.status).toBe(403)
    })

    test("check-user nunca marca isAdmin true", async () => {
        const user = await seedUser()
        const res = await api().get("/auth/user/check-user").set("Cookie", user.cookie)
        expect(res.status).toBe(200)
        expect(res.body.isAdmin).toBe(false)
    })
})
