export function getFileIcon(name: string): string {
    const ext = name.split(".").pop()?.toLowerCase() || ""

    if (ext === "pdf") return "📄"
    if (["xlsx", "xls", "csv"].includes(ext)) return "📊"
    if (["docx", "doc", 'txt'].includes(ext)) return "📝"
    if (["zip", "rar", "7z"].includes(ext)) return "🗜"
    if (["mp4", "mov", "avi"].includes(ext)) return "🎬"
    if (["mp3", "wav", "ogg"].includes(ext)) return "🎵"

    return "📎"
}