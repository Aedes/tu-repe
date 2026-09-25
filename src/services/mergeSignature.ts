import { ProbeResult } from "../utils/ffprobe"

export type MergeSignature = {
    videoCodec: string
    width: number
    height: number
    pixFmt: string
    audioCodec: string
    audioChannels: number
}

export const mergeSignatureFromProbe = (probe: ProbeResult): MergeSignature | null => {
    const video = probe.streams?.find((stream) => stream.codec_type === "video")
    const audio = probe.streams?.find((stream) => stream.codec_type === "audio")
    if (!video?.codec_name || !video.width || !video.height || !video.pix_fmt) return null
    return {
        videoCodec: video.codec_name,
        width: video.width,
        height: video.height,
        pixFmt: video.pix_fmt,
        audioCodec: audio?.codec_name || "",
        audioChannels: audio?.channels || 0,
    }
}

// Formato estable: video|ancho|alto|pix_fmt|audio|canales. Un cambio rompe la comparación con filas ya guardadas.
export const encodeMergeSignature = (signature: MergeSignature): string => (
    [
        signature.videoCodec,
        signature.width,
        signature.height,
        signature.pixFmt,
        signature.audioCodec,
        signature.audioChannels,
    ].join("|")
)

export const signaturesAreCompatible = (signatures: Array<string | null | undefined>): boolean => {
    if (signatures.length < 2) return false
    const [first, ...rest] = signatures
    if (!first) return false
    return rest.every((value) => value === first)
}
