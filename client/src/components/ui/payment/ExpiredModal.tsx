import Modal from "./Modal.tsx"

interface Props {
    open: boolean
    onClose: () => void
    onNewRequisites: () => void
    onAlreadyPaid: () => void
}

export default function ExpiredModal({ open, onClose, onNewRequisites, onAlreadyPaid }: Props) {
    return (
        <Modal open={open} onClose={onClose}>
            <div className="mb-3 text-[40px]">⏰</div>
            <h3 className="mb-2 text-[17px] font-black">Время на оплату истекло</h3>
            <p className="mb-5 text-[13px] leading-relaxed text-text-secondary">
                Если вы ещё не оплатили, нажмите на кнопку ниже для получения новых реквизитов
            </p>
            <div className="flex flex-col gap-2.5">
                <button
                    onClick={onNewRequisites}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-accent-cyan to-accent-cyan-dark px-5 py-3.5 text-[13px] font-extrabold uppercase text-bg-primary transition hover:-translate-y-0.5"
                >
                    🔄 Новые реквизиты
                </button>
                <button
                    onClick={onAlreadyPaid}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-5 py-3.5 text-[13px] font-bold text-text-primary transition hover:border-accent-cyan hover:text-accent-cyan"
                >
                    ✓ Я уже оплатил
                </button>
            </div>
        </Modal>
    )
}
