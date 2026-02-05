export const getDateInUTC = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hh = date.getHours()
    const mm = date.getMinutes()
    const ss = date.getSeconds()
    const dateUTC = new Date(`${String(year).padStart(2, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}Z`)
    return dateUTC
}