import type { ReactNode } from "react"

interface Props {
    open: boolean
    onClose?: () => void
    children: ReactNode
}

export default function Modal({ open, onClose, children }: Props) {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-bg-primary/60 backdrop-blur-sm">
            <div className="relative w-[90%] max-w-[380px] animate-modal-in rounded-2xl border border-border bg-bg-secondary p-8 text-center">
                {onClose && (
                    <button onClick={onClose} className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-border text-sm text-text-secondary transition hover:bg-bg-card hover:text-text-primary">
                        ✕
                    </button>
                )}
                {children}
            </div>
        </div>
    )
}
