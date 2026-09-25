import { IClub, ICourt, IUser, Theme } from "../types"

const publicTheme = (theme?: Theme | string | null): Theme | null => {
    if (!theme) return null
    if (typeof theme === "string") {
        try {
            return JSON.parse(theme)
        } catch {
            return null
        }
    }
    return theme
}

export const toPublicClub = (club: IClub) => ({
    id: club.publicId,
    name: club.name,
    openTime: club.openTime,
    closeTime: club.closeTime,
    appointmentDuration: club.appointmentDuration,
    country: club.country,
    province: club.province,
    city: club.city,
    address: club.address,
    urlId: club.urlId,
    phone: club.phone ?? null,
    instagramHandle: club.instagramHandle ?? null,
    description: club.description ?? null,
    profileImageUrl: club.profileImageUrl ?? null,
    coverImageUrl: club.coverImageUrl ?? null,
    theme: publicTheme(club.theme),
})

export const toPublicCourt = (court: ICourt) => ({
    id: court.publicId,
    name: court.name,
})

export const toOwnerCourt = (court: ICourt) => ({
    id: court.publicId,
    name: court.name,
})

export const toAdminCourt = (court: ICourt, includeStreamKey = false) => ({
    id: court.publicId,
    name: court.name,
    cameraHost: court.cameraHost,
    ...(includeStreamKey ? {
        cameraPath: court.cameraPath,
        streamKey: court.streamKey,
    } : {}),
})

export const toPublicClubWithCourts = (club: IClub & { courts?: ICourt[] }) => ({
    ...toPublicClub(club),
    courts: (club.courts || []).map(toPublicCourt),
})

export const toOwnerClubWithCourts = (club: IClub & { courts?: ICourt[] }) => ({
    ...toPublicClub(club),
    courts: (club.courts || []).map(toOwnerCourt),
})

export const toAdminClubWithCourts = (club: IClub & { courts?: ICourt[] }) => ({
    ...toPublicClub(club),
    courts: (club.courts || []).map((court) => toAdminCourt(court, false)),
})

export const toPublicUser = (user: IUser) => ({
    id: user.publicId,
    name: user.name,
    email: user.email,
    role: user.systemRole === "ADMIN" ? "admin" : "user",
})
