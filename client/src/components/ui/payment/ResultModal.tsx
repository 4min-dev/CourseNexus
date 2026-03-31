import Modal from "./Modal"
import type { ResultState } from "@/hooks/usePayment"

interface Props {
    open: boolean
    state: ResultState | null
    onClose: () => void
}

export default function ResultModal({ open, state, onClose }: Props) {
    const barClass =
        (state?.status === "CHECKING" || state?.status === "PENDING")
            ? "animate-progress-pulse bg-accent-cyan"
            : state?.status === "SUCCESS"
                ? "w-full bg-green-500 transition-all duration-300"
                : "w-full bg-red-500 transition-all duration-300"

    return (
        <Modal open={open}>
            <div className="mb-3 text-5xl">{state?.icon}</div>
            <h3 className="mb-2 text-[17px] font-black">{state?.title}</h3>
            <p className="mb-5 text-[13px] leading-relaxed text-text-secondary">{state?.text}</p>
            <div className="mb-4 h-1 overflow-hidden rounded-sm bg-bg-card">
                <div className={`h-full rounded-sm ${barClass}`} />
            </div>
            {(state?.status !== "CHECKING" && state?.status !== "PENDING") && (
                <button
                    onClick={onClose}
                    className="w-full rounded-xl bg-gradient-to-br from-accent-cyan to-accent-cyan-dark px-5 py-3.5 text-[13px] font-extrabold uppercase text-bg-primary transition hover:-translate-y-0.5"
                >
                    {state?.status === "SUCCESS" ? "Отлично" : "Закрыть"}
                </button>
            )}
        </Modal>
    )
}
