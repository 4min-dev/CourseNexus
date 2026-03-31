export function formatFileSize(bytes: number | null | undefined): string {
    if (bytes == null || bytes === 0) return "—"

    const units = ["Б", "КБ", "МБ", "ГБ", "ТБ"]
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024
        unitIndex++
    }

    const precision = unitIndex <= 1 ? 0 : 1
    const formatted = size.toFixed(precision)

    const clean = formatted.endsWith(".0") ? formatted.slice(0, -2) : formatted

    return `${clean} ${units[unitIndex]}`
}