const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires"

function zoneParts(date: Date, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormatPart[] {
    return new Intl.DateTimeFormat("en-US", {
        timeZone: ARGENTINA_TIME_ZONE,
        hourCycle: "h23",
        ...options,
    }).formatToParts(date)
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
    const value = parts.find((item) => item.type === type)?.value ?? "00"
    if (type === "hour" && value === "24") return "00"
    return value
}

export function argentinaWallClock(date: Date): string {
    const parts = zoneParts(date, { hour: "2-digit", minute: "2-digit" })
    const hour = part(parts, "hour").padStart(2, "0")
    const minute = part(parts, "minute").padStart(2, "0")
    return `${hour}:${minute}`
}
