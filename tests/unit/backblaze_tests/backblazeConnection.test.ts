import { b2 } from "../../../src/config/backblaze_b2";
import { B2_BUCKET_ID } from "../../../src/config/config";

test("debería conectarse a Backblaze B2 con las credenciales proporcionadas", async () => {
    try {
        const response = await b2.authorize();

        expect(response.status).toBe(200);

        const { data } = await b2.getUploadUrl({
            bucketId: B2_BUCKET_ID
        })

        expect(data).toHaveProperty("uploadUrl");
    } catch (error) {
        throw new Error("No se pudo conectar a Backblaze B2: " + error);
    }
})
