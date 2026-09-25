import { encodeMergeSignature, mergeSignatureFromProbe, signaturesAreCompatible } from "../../../src/services/mergeSignature"
import { signRenderContinuation, verifyRenderContinuation } from "../../../src/utils/renderContinuation"

describe("firma de compatibilidad", () => {
    const probe = {
        streams: [
            { codec_type: "video", codec_name: "h264", width: 1280, height: 720, pix_fmt: "yuv420p" },
            { codec_type: "audio", codec_name: "aac", channels: 2 },
        ],
    }

    test("codifica códec, resolución, píxeles y audio", () => {
        const signature = mergeSignatureFromProbe(probe)
        expect(signature).not.toBeNull()
        expect(encodeMergeSignature(signature!)).toBe("h264|1280|720|yuv420p|aac|2")
    })

    test("un fragmento sin video no tiene firma", () => {
        expect(mergeSignatureFromProbe({ streams: [{ codec_type: "audio", codec_name: "aac", channels: 2 }] })).toBeNull()
    })

    test("exige la misma firma en todos los fragmentos", () => {
        expect(signaturesAreCompatible(["h264|1280|720|yuv420p|aac|2", "h264|1280|720|yuv420p|aac|2"])).toBe(true)
        expect(signaturesAreCompatible(["h264|1280|720|yuv420p|aac|2", "h264|1920|1080|yuv420p|aac|2"])).toBe(false)
        expect(signaturesAreCompatible([null, null])).toBe(false)
        expect(signaturesAreCompatible(["h264|1280|720|yuv420p|aac|2"])).toBe(false)
    })
})

describe("token para continuar la preparación", () => {
    const input = {
        clubUrlId: "cluburl01",
        courtPublicId: "11111111-1111-4111-8111-111111111111",
        startTime: "2026-01-01T18:00:00.000Z",
    }

    test("acepta el turno firmado y rechaza otro horario o una firma alterada", () => {
        const token = signRenderContinuation(input)
        expect(verifyRenderContinuation(token, input)).toBe(true)
        expect(verifyRenderContinuation(token, { ...input, startTime: "2026-01-01T19:00:00.000Z" })).toBe(false)
        expect(verifyRenderContinuation(`${token}x`, input)).toBe(false)
        expect(verifyRenderContinuation("no-es-un-token", input)).toBe(false)
    })
})
