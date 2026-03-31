import { useState, useEffect, useCallback } from "react"
import { formatFileSize } from "@/lib/formatFileSize"

interface ImageFile {
    id: string
    fileName: string
    fileUrl: string
    fileSize?: number
}

interface Props {
    images: ImageFile[]
    startIndex: number
    onClose: () => void
}

export function LessonLightbox({ images, startIndex, onClose }: Props) {
    const [current, setCurrent] = useState(startIndex)
    const [loaded, setLoaded] = useState(false)
    const [zoomed, setZoomed] = useState(false)
    const [animDir, setAnimDir] = useState<"left" | "right" | null>(null)

    const go = useCallback(
        (dir: "prev" | "next") => {
            setLoaded(false)
            setZoomed(false)
            setAnimDir(dir === "next" ? "left" : "right")
            setTimeout(() => setAnimDir(null), 250)

            setCurrent((c) =>
                dir === "next"
                    ? (c + 1) % images.length
                    : (c - 1 + images.length) % images.length
            )
        },
        [images.length]
    )

    const handleDownload = useCallback(async () => {
        const img = images[current]
        try {
            const response = await fetch(img.fileUrl)
            if (!response.ok) throw new Error("Не удалось загрузить файл")

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)

            const link = document.createElement("a")
            link.href = url
            link.download = img.fileName // ← именно здесь задаётся имя файла при скачивании
            document.body.appendChild(link)
            link.click()

            // Очистка
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
        } catch (err) {
            console.error("Ошибка скачивания:", err)
            // Можно показать тост с ошибкой
            alert("Не удалось скачать изображение")
        }
    }, [current, images])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
            if (e.key === "ArrowRight") go("next")
            if (e.key === "ArrowLeft") go("prev")
        }

        window.addEventListener("keydown", onKey)
        document.body.style.overflow = "hidden"

        return () => {
            window.removeEventListener("keydown", onKey)
            document.body.style.overflow = ""
        }
    }, [go, onClose])

    const img = images[current]

    return (
        <div
            className="fixed inset-0 z-[9999] bg-[#07080bf7] !m-0 flex flex-col items-center justify-center animate-fade-in"
            onClick={onClose}
        >
            <div
                className="absolute top-0 left-0 right-0 h-[54px] flex items-center gap-3 px-4 bg-gradient-to-b from-black/75 to-transparent z-10"
                onClick={(e) => e.stopPropagation()}
            >
                <span className="text-xs text-white/40 tabular-nums">
                    {current + 1} / {images.length}
                </span>

                <span className="text-sm text-white/60 flex-1 truncate">
                    {img.fileName}
                </span>

                <div className="flex items-center gap-2">
                    {img.fileSize && (
                        <span className="text-xs text-white/30">
                            {formatFileSize(img.fileSize)}
                        </span>
                    )}

                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            handleDownload()
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 bg-white/10 hover:bg-white/20 transition"
                        title="Скачать изображение"
                    >
                        ⬇
                    </button>

                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 bg-white/10 hover:bg-white/20 transition"
                    >
                        ✕
                    </button>
                </div>
            </div>

            <div
                className={`flex items-center justify-center w-full flex-1 px-[88px] pt-[60px] pb-[96px] relative ${animDir
                        ? animDir === "left"
                            ? "animate-slide-left"
                            : "animate-slide-right"
                        : ""
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                {!loaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-white/10 border-t-white/40 rounded-full animate-spin" />
                    </div>
                )}

                <img
                    key={current}
                    src={img.fileUrl}
                    alt={img.fileName}
                    draggable={false}
                    onLoad={() => setLoaded(true)}
                    onClick={() => setZoomed((z) => !z)}
                    className={`max-w-full max-h-full object-contain rounded-lg shadow-[0_24px_80px_rgba(0,0,0,0.85)] transition ${loaded ? "opacity-100" : "opacity-0"
                        } ${zoomed ? "scale-[1.85] cursor-zoom-out" : "cursor-zoom-in"}`}
                />
            </div>

            {images.length > 1 && (
                <>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            go("prev")
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 border border-white/10 hover:bg-white/20 flex items-center justify-center"
                    >
                        ‹
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            go("next")
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 border border-white/10 hover:bg-white/20 flex items-center justify-center"
                    >
                        ›
                    </button>
                </>
            )}

            {images.length > 1 && (
                <div
                    className="absolute bottom-0 left-0 right-0 h-[80px] flex items-center justify-center gap-[5px] px-[60px] bg-gradient-to-t from-black/80 to-transparent overflow-x-auto scrollbar-hide"
                    onClick={(e) => e.stopPropagation()}
                >
                    {images.map((f, i) => (
                        <button
                            key={f.id}
                            onClick={() => {
                                setLoaded(false)
                                setZoomed(false)
                                setCurrent(i)
                            }}
                            className={`w-[52px] h-[52px] rounded-md overflow-hidden border-2 transition ${i === current
                                    ? "border-primary scale-110 opacity-100 shadow-[0_0_14px_rgba(108,143,245,0.5)]"
                                    : "border-transparent opacity-50 hover:opacity-75 hover:scale-105"
                                }`}
                        >
                            <img
                                src={f.fileUrl}
                                alt={f.fileName}
                                className="w-full h-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}