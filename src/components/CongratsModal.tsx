interface CongratsModalProps {
  amount: number
  message: string
  onClose: () => void
}

export function CongratsModal({ amount, message, onClose }: CongratsModalProps) {
  return (
    <div className="modal-overlay active" onClick={onClose} role="presentation">
      <div className="modal-content" onClick={e => e.stopPropagation()} role="dialog">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M0.75 0.75L4.75 4.75M8.75 8.75L4.75 4.75M4.75 4.75L8.75 0.75M4.75 4.75L0.75 8.75" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <h3 className="heading-lg text-center mb-5">Congratulations!</h3>
        <div className="flex flex-col items-center mb-4 p-6 rounded-lg border border-[#161616]">
          <p className="heading-xl mb-2">
            {amount} <span className="text-gold font-semibold">$BLC</span>
          </p>
          <p className="text-sm text-white/50">{message}</p>
        </div>
        <button type="button" className="btn btn--white w-full" onClick={onClose}>
          Thank You
        </button>
      </div>
    </div>
  )
}
