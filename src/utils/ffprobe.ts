import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

interface ProbeStream {
    codec_type?: string
    codec_name?: string
    width?: number
    height?: number
    pix_fmt?: string
    avg_frame_rate?: string
    duration?: string
    channels?: number
}

export interface ProbeResult {
    format?: { duration?: string; format_name?: string; size?: string }
    streams?: ProbeStream[]
}

export async function probeMedia(filePath: string): Promise<ProbeResult> {
    const { stdout } = await execFileAsync("ffprobe", [
        "-v", "error",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        filePath,
    ], { timeout: 20_000, env: { ...process.env, TZ: "UTC" } })
    return JSON.parse(stdout) as ProbeResult
}

export function parseDurationSeconds(probe: ProbeResult): number {
    const fromFormat = Number(probe.format?.duration)
    if (Number.isFinite(fromFormat) && fromFormat > 0) return fromFormat
    const fromStream = probe.streams?.find((stream) => stream.duration)
    const value = Number(fromStream?.duration)
    if (Number.isFinite(value) && value > 0) return value
    throw new Error("No se pudo obtener la duración")
}

export function parseFps(rate?: string): number {
    if (!rate || rate === "0/0") return 0
    const [num, den] = rate.split("/").map(Number)
    if (!den) return num || 0
    return num / den
}
