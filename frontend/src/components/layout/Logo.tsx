export function Logo({
  compact = false,
}: {
  compact?: boolean;
  light?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 select-none">
      {/* Glowing Green Heart ECG Mark matching Image 2 */}
      <div className="relative flex size-9 items-center justify-center rounded-xl bg-[#00E599]/10 border border-[#00E599]/30 shadow-[0_0_15px_rgba(0,229,153,0.3)]">
        <svg viewBox="0 0 24 24" fill="none" className="size-5">
          {/* Heart Outline */}
          <path
            d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572"
            stroke="#00E599"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* ECG Pulse line */}
          <path
            d="M7 12h2.5l1.5 -3l2 6l1.5 -3h2.5"
            stroke="#00E599"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {!compact && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-[17px] font-extrabold tracking-tight text-white">
              MediCore
            </span>
            <span className="rounded-md bg-[#00E599]/20 px-1.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-[#00E599] border border-[#00E599]/30">
              AI
            </span>
          </div>
          <span className="text-[10px] font-medium tracking-wide uppercase text-slate-400">
            Clinical Intelligence
          </span>
        </div>
      )}
    </div>
  );
}
