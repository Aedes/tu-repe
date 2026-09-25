import { B2Service } from "../../../src/services/B2Service"

test("debería obtener la URL de descarga de un archivo de Backblaze B2 correctamente", async () => {
    const b2FileUrl = await B2Service.getDownloadUrl("club_1/court_2/video.mp4")

    expect(b2FileUrl).toContain("s3.example.test")
    expect(b2FileUrl).toContain("club_1/court_2/video.mp4")
    expect(b2FileUrl).toContain("X-Amz-Signature")
})