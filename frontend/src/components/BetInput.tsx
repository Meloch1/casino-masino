import { useState } from "react";

interface BetInputProps {
  bet: number;
  balance: number;
  disabled: boolean;
  onChange: (amount: number) => void;
}

export function BetInput({ bet, balance, disabled, onChange }: BetInputProps) {
  const [raw, setRaw] = useState(String(bet));
  const [lastClicked, setLastClicked] = useState<number | null>(null);

  const handleChange = (val: string) => {
    setRaw(val);
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0) onChange(n);
  };

  const preset = (pct: number) => {
    const amount = Math.max(1, Math.floor(balance * pct));
    setRaw(String(amount));
    onChange(amount);
    setLastClicked(pct);
    setTimeout(() => setLastClicked(null), 300);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-400 font-bold text-lg">
            ⭐
          </span>
          <input
            type="number"
            min={1}
            max={balance}
            value={raw}
            disabled={disabled}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full bg-white/5 border border-white/15 rounded-xl pl-10 pr-4 py-3 text-white text-xl font-bold text-center focus:outline-none focus:border-cyan-500/60 focus:bg-white/8 focus:shadow-[0_0_14px_rgba(6,182,212,0.25)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[0.1, 0.25, 0.5, 1].map((pct) => (
          <button
            key={pct}
            disabled={disabled}
            onClick={() => preset(pct)}
            className={`py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed ${
              lastClicked === pct
                ? "bg-cyan-500/30 border-cyan-500/60 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                : "bg-white/5 border-white/10 text-white/60 hover:bg-white/12 hover:border-white/25 hover:text-white"
            }`}
          >
            {pct === 1 ? "МАКС" : `${pct * 100}%`}
          </button>
        ))}
      </div>
    </div>
  );
}
