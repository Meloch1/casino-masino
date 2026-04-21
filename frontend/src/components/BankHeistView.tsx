import { formatMultiplier } from "@/lib/gameLogic";
import { BetInput } from "@/components/BetInput";
import type { GameState } from "@/hooks/useGameState";

interface BankHeistViewProps {
  state: GameState;
  goLive: () => void;
  collect: () => void;
  reset: () => void;
  setBet: (n: number) => void;
  onBuyStars: () => void;
}

function openAngleDeg(mult: number): number {
  return Math.min((Math.log(Math.max(mult, 1.001)) / Math.log(30)) * 130, 130);
}

/* ── Animated safe door while game is live ──────── */
function SafeTrack({ multiplier, dangerZone, hypeMode }: {
  multiplier: number; dangerZone: boolean; hypeMode: boolean;
}) {
  const angle = openAngleDeg(multiplier);
  const pct   = Math.min(angle / 130, 1);

  const glowColor = dangerZone ? "rgba(239,68,68,0.7)" : hypeMode ? "rgba(236,72,153,0.7)" : "rgba(180,83,9,0.5)";
  const labelCls  = dangerZone ? "text-red-400" : hypeMode ? "text-pink-300" : "text-amber-400";
  const statusTxt = hypeMode ? "🔥 БОЛЬШОЙ КУШ" : dangerZone ? "🚔 ПОЛИЦИЯ БЛИЗКО!" : "🔓 ВЗЛОМ...";

  return (
    <div className="flex flex-col items-center justify-center py-6 gap-4 relative" style={{ minHeight: 230 }}>
      {dangerZone && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center,rgba(239,68,68,0.08) 0%,transparent 70%)", animation: "breathe 0.8s ease-in-out infinite" }}
        />
      )}

      {/* ── SAFE ── */}
      <div className="relative" style={{ width: 190, height: 165 }}>
        {/* Body */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg,#374151 0%,#1f2937 100%)",
            border: "3px solid #4b5563",
            boxShadow: `0 0 30px ${glowColor}, inset 0 2px 4px rgba(255,255,255,0.04)`,
          }}
        >
          <div className="absolute top-2 left-0 right-0 text-center text-white/20 text-[9px] font-black tracking-[0.3em] uppercase">
            VAULT
          </div>
          {/* Interior – visible as door opens */}
          {pct > 0.05 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1"
              style={{ opacity: Math.min(pct * 1.8, 1) }}
            >
              <div className="text-5xl" style={{
                animation: pct > 0.4 ? "bob 0.7s ease-in-out infinite" : undefined,
                filter: "drop-shadow(0 0 14px rgba(234,179,8,0.9))",
              }}>
                {pct > 0.75 ? "💰💰💰" : pct > 0.45 ? "💰💰" : "💰"}
              </div>
              {pct > 0.6 && (
                <div className="text-xs font-black text-yellow-400 animate-pulse tracking-widest">
                  {Math.floor(pct * 100)}% ОТКРЫТ
                </div>
              )}
            </div>
          )}
        </div>

        {/* Door – rotates open in perspective */}
        <div className="absolute inset-0 rounded-2xl"
          style={{
            background: "linear-gradient(135deg,#6b7280 0%,#374151 55%,#4b5563 100%)",
            border: "3px solid #9ca3af",
            transformOrigin: "left center",
            transform: `perspective(900px) rotateY(-${angle}deg)`,
            transition: "transform 75ms linear",
            backfaceVisibility: "hidden",
            boxShadow: "inset 0 2px 10px rgba(0,0,0,0.55)",
          }}
        >
          {/* Circular handle */}
          <div className="absolute rounded-full"
            style={{
              width: 50, height: 50,
              top: "50%", left: "50%",
              transform: `translate(-50%,-50%) rotate(${angle * 2.5}deg)`,
              background: "radial-gradient(circle,#d1d5db 0%,#6b7280 55%,#374151 100%)",
              border: "3px solid #9ca3af",
              boxShadow: "0 3px 10px rgba(0,0,0,0.7),inset 0 1px 3px rgba(255,255,255,0.25)",
            }}
          >
            {[0,90,180,270].map((r) => (
              <div key={r} className="absolute bg-gray-400 rounded-full"
                style={{ width: 4, height: 16, top: "50%", left: "50%",
                  transform: `translate(-50%,-50%) rotate(${r}deg) translateY(-10px)` }}
              />
            ))}
          </div>
          {/* Bolt holes */}
          {[[18,18],[172,18],[18,148],[172,148]].map(([x,y],i) => (
            <div key={i} className="absolute w-3 h-3 rounded-full bg-gray-900 border border-gray-600"
              style={{ left: x-6, top: y-6 }} />
          ))}
        </div>
      </div>

      {/* Multiplier + status */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="font-black tabular-nums text-white drop-shadow-lg"
          style={{ fontSize: multiplier >= 10 ? 36 : 44 }}>
          {formatMultiplier(multiplier)}
        </span>
        <span className={`text-xs font-semibold uppercase tracking-widest animate-pulse ${labelCls}`}>
          {statusTxt}
        </span>
      </div>
    </div>
  );
}

/* ── Idle / crashed / collected visual ─────────── */
function SafeOrb({ phase, multiplier, collectedAmount, bet }: {
  phase: string; multiplier: number; collectedAmount: number; bet: number;
}) {
  const isCrashed   = phase === "crashed";
  const isCollected = phase === "collected";
  const isIdle      = phase === "idle";

  const bg = isCrashed ? "linear-gradient(to br,#dc2626,#7f1d1d)"
    : isCollected ? "linear-gradient(to br,#16a34a,#065f46)"
    : "linear-gradient(135deg,#4b5563 0%,#1f2937 100%)";
  const glow = isCrashed ? "0 0 60px rgba(239,68,68,0.65),0 0 120px rgba(239,68,68,0.3)"
    : isCollected ? "0 0 60px rgba(34,197,94,0.65),0 0 120px rgba(34,197,94,0.3)"
    : isIdle ? "0 0 30px rgba(107,114,128,0.25)" : "none";

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6 relative">
      {isIdle && (
        <>
          <div className="absolute w-44 h-44 rounded-full border border-amber-500/15 anim-ripple" />
          <div className="absolute w-44 h-44 rounded-full border border-gray-500/10 anim-ripple-delay" />
        </>
      )}
      <div className={`relative w-44 h-44 rounded-full flex flex-col items-center justify-center transition-all duration-300 ${isIdle ? "anim-bob" : ""}`}
        style={{ background: bg, boxShadow: glow }}>
        {isCrashed   && <div className="text-4xl mb-1" style={{ animation: "bob 0.35s ease-in-out infinite" }}>🚨</div>}
        {isCollected && <div className="text-4xl mb-1 animate-[spark-in_0.6s_ease-out]">💰</div>}
        {isIdle      && <div className="text-5xl anim-bob" style={{ animationDelay: "0.3s" }}>🏦</div>}

        {(isCrashed || isCollected) && (
          <span className={`font-black tabular-nums ${multiplier >= 10 ? "text-4xl" : "text-5xl"} text-white drop-shadow-lg`}>
            {formatMultiplier(multiplier)}
          </span>
        )}
        {isCrashed   && <span className="text-red-200/80   text-xs mt-1 uppercase tracking-widest">ПОЙМАН</span>}
        {isCollected && <span className="text-green-200/80 text-xs mt-1 uppercase tracking-widest">СБЕЖАЛ</span>}
      </div>

      {isCrashed && (
        <div className="text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="text-red-400 font-bold text-base">Полиция поймала на {formatMultiplier(multiplier)}</div>
          <div className="text-white/40 text-sm mt-0.5">Потеряно {bet} ⭐</div>
        </div>
      )}
      {isCollected && (
        <div className="text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="text-green-400 font-bold text-base">Сбежал с {collectedAmount} ⭐</div>
          <div className="text-white/40 text-sm mt-0.5">
            {collectedAmount > bet ? `+${collectedAmount - bet} прибыль`
              : collectedAmount === bet ? "в ноль"
              : `-${bet - collectedAmount} убыток`}
          </div>
        </div>
      )}
      {isIdle && (
        <div className="text-white/25 text-sm text-center animate-in fade-in duration-500">
          Поставь ставку и взламывай сейф.<br />
          <span className="text-white/15 text-xs">Уйди с деньгами до приезда полиции!</span>
        </div>
      )}
    </div>
  );
}

/* ── Main export ────────────────────────────────── */
export default function BankHeistView({ state, goLive, collect, reset, setBet, onBuyStars }: BankHeistViewProps) {
  const { phase, profile, currentBet, currentMultiplier, dangerZone, hypeMode, collectedAmount } = state;
  const isLive = phase === "live";
  const isDone = phase === "crashed" || phase === "collected";

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Police flash on crash */}
      {phase === "crashed" && (
        <div className="fixed inset-0 pointer-events-none z-40"
          style={{ background: "rgba(239,68,68,0.18)", animation: "breathe 0.35s ease-in-out 4" }}
        />
      )}

      {isLive ? (
        <SafeTrack multiplier={currentMultiplier} dangerZone={dangerZone} hypeMode={hypeMode} />
      ) : (
        <SafeOrb phase={phase} multiplier={currentMultiplier} collectedAmount={collectedAmount} bet={currentBet} />
      )}

      {/* Live info bar */}
      {isLive && (
        <div className="mx-4 mb-2 rounded-2xl border border-white/10 bg-white/3 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2">
            <span className={`text-xs font-bold ${dangerZone ? "text-red-400 animate-pulse" : "text-amber-400"}`}>
              {dangerZone ? "🚔 Полиция на подходе!" : "🔐 Вскрываем сейф..."}
            </span>
            <div className="flex-1" />
            <span className="text-white/30 text-[10px]">
              {currentBet} ⭐ → {Math.floor(currentBet * currentMultiplier)} ⭐
            </span>
          </div>
        </div>
      )}

      <div className="px-4 pb-3 space-y-3">
        {phase === "idle" && (
          <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
            <BetInput bet={currentBet} balance={profile.balance} disabled={false} onChange={setBet} />
          </div>
        )}

        {phase === "idle" && profile.balance === 0 && (
          <button
            onClick={onBuyStars}
            className="w-full py-4 rounded-2xl font-black text-lg tracking-wide text-white relative overflow-hidden active:scale-95 transition-transform duration-100"
            style={{
              background: "linear-gradient(90deg,#7c3aed,#a855f7,#7c3aed)",
              backgroundSize: "200% 100%",
              animation: "shimmer-slide 2s linear infinite",
              boxShadow: "0 0 20px rgba(168,85,247,0.4)",
            }}
          >
            ⭐ Купить звёзды для игры
          </button>
        )}

        {phase === "idle" && profile.balance > 0 && (
          <button
            onClick={goLive}
            disabled={currentBet <= 0 || currentBet > profile.balance}
            className="w-full py-4 rounded-2xl font-black text-xl tracking-wide text-white relative overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform duration-100"
            style={{
              background: "linear-gradient(90deg,#92400e,#d97706,#92400e)",
              backgroundSize: "300% 100%",
              animation: "shimmer-slide 3s linear infinite",
              boxShadow: "0 0 24px rgba(180,83,9,0.5)",
            }}
          >
            🏦 ОГРАБИТЬ БАНК
          </button>
        )}

        {isLive && (
          <button
            onClick={collect}
            className={`w-full py-5 rounded-2xl font-black text-2xl tracking-wide text-white active:scale-95 transition-all duration-150 relative overflow-hidden ${
              dangerZone ? "shadow-[0_0_35px_rgba(239,68,68,0.85)]" : "shadow-[0_0_25px_rgba(180,83,9,0.6)]"
            }`}
            style={{
              background: dangerZone
                ? "linear-gradient(90deg,#7f1d1d,#ef4444,#7f1d1d)"
                : "linear-gradient(90deg,#92400e,#d97706,#92400e)",
              backgroundSize: "200% 100%",
              animation: "shimmer-slide 1.5s linear infinite",
            }}
          >
            💰 УЙТИ С ДЕНЬГАМИ
            <div className="text-sm font-normal opacity-80 mt-0.5">
              = {Math.floor(currentBet * currentMultiplier)} ⭐ · {formatMultiplier(currentMultiplier)}
            </div>
          </button>
        )}

        {isDone && (
          <button
            onClick={reset}
            className="w-full py-4 rounded-2xl font-black text-xl bg-white/10 border border-white/20 text-white hover:bg-white/15 active:scale-95 transition-all animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            Ограбить снова
          </button>
        )}
      </div>
    </div>
  );
}
