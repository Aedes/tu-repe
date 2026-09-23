export const getDateInUTC = (date: Date): Date => {
    return new Date(date.toISOString())
}
