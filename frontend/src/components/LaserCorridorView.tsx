import { useState, useEffect, useRef, useCallback } from "react";
import { BetInput } from "@/components/BetInput";

/* ── Types ───────────────────────────────────────── */
type LCPhase = "idle" | "stepping" | "running" | "burned" | "escaped";

interface ChatLine { id: number; user: string; text: string; danger: boolean; }

interface LaserCorridorViewProps {
  balance: number;
  bet: number;
  setBet: (n: number) => void;
  onResult: (delta: number) => void;
  onBuyStars: () => void;
}

/* ── Constants ───────────────────────────────────── */
const SAFE_CHAT  = ["ДАВАЙ ЕЩЁ!!", "ИДИ ДАЛЬШЕ!", "НЕ ОСТАНАВЛИВАЙСЯ!", "ТЫ МОЖЕШЬ!", "ЕЩЁ ШАГ!", "ГО ГО ГО!", "ПРОДОЛЖАЙ!", "РИСК = ПРОФИТ!", "Я ВЕРЮ В ТЕБЯ!", "ПРОРВЁШЬСЯ!"];
const STOP_CHAT  = ["СТОП!!", "ОСТАНОВИСЬ!!!", "ХВАТИТ!!", "ВЫХОДИ!", "ЗАБИРАЙ!", "ОПАСНО!!", "НЕ ХОДИ ТУДА!", "СТООП!!", "МОЛЮ ТЕБЯ...", "Я БЫ ВЫШЕЛ..."];
const USERNAMES  = ["КиберПро","ЛазерМастер","НеонФокс","МаксиStar","АнонФан","ТёмныйЧат","КолянГеймер","АняСмотрит","ПроТипс","ВиталяLIVE"];

function rnd<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }

function getMultiplier(step: number): number {
  if (step === 0) return 1.0;
  return Math.round((1.0 + step * 0.5 + step * step * 0.07) * 100) / 100;
}

function getBurnChance(step: number): number {
  return Math.min(0.22 + (step - 1) * 0.13, 0.93);
}

/* ── Laser row visual ───────────────────────────── */
function LaserRow({ status, step, burnChance, flash }: {
  status: "passed" | "current" | "danger" | "far";
  step: number;
  burnChance: number;
  flash: boolean;
}) {
  const isPassed  = status === "passed";
  const isCurrent = status === "current";
  const isDanger  = status === "danger";

  const beamColor = isPassed  ? "rgba(34,197,94,0.6)"
    : isCurrent ? "rgba(99,102,241,0.8)"
    : isDanger  ? "rgba(239,68,68,0.85)"
    : "rgba(239,68,68,0.3)";

  const glowColor = isPassed  ? "rgba(34,197,94,0.4)"
    : isCurrent ? "rgba(99,102,241,0.5)"
    : isDanger  ? "rgba(239,68,68,0.5)"
    : "rgba(239,68,68,0.15)";

  return (
    <div className={`relative flex items-center gap-2 py-1.5 rounded-lg px-2 transition-all duration-200 ${
      isCurrent ? "bg-violet-500/10 border border-violet-500/30" :
      isPassed  ? "bg-green-500/5  border border-green-500/10" :
      isDanger  ? "bg-red-500/8   border border-red-500/20" :
                  "bg-white/2     border border-white/5"
    } ${flash && isCurrent ? "animate-pulse" : ""}`}
    >
      {/* Zone label */}
      <span className={`text-[10px] font-black uppercase shrink-0 w-14 ${
        isPassed ? "text-green-500/60" : isCurrent ? "text-violet-400" : isDanger ? "text-red-400/70" : "text-white/20"
      }`}>
        ЗОНА {step}
      </span>

      {/* Laser emitter left */}
      <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-md"
        style={{ background: beamColor, boxShadow: `0 0 8px ${glowColor}` }}
      />

      {/* Laser beam */}
      <div className="flex-1 h-0.5 rounded-full relative overflow-hidden"
        style={{ background: beamColor, boxShadow: `0 0 6px ${glowColor}` }}
      >
        {(isDanger || isCurrent) && !isPassed && (
          <div className="absolute inset-0 animate-[shimmer-slide_1s_linear_infinite]"
            style={{ background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.4) 50%,transparent 100%)", backgroundSize: "200% 100%" }}
          />
        )}
      </div>

      {/* Laser emitter right */}
      <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-md"
        style={{ background: beamColor, boxShadow: `0 0 8px ${glowColor}` }}
      />

      {/* Status indicator */}
      <div className="shrink-0 w-16 text-right">
        {isPassed && <span className="text-green-400 text-xs font-bold">✅</span>}
        {isCurrent && <span className="text-violet-300 text-[10px] font-black">🏃 ВЫ</span>}
        {(isDanger || status === "far") && (
          <span className={`text-[10px] font-bold ${isDanger ? "text-red-400" : "text-white/25"}`}>
            {Math.round(burnChance * 100)}% 🔥
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────── */
export default function LaserCorridorView({ balance, bet, setBet, onResult, onBuyStars }: LaserCorridorViewProps) {
  const [phase, setPhase]       = useState<LCPhase>("idle");
  const [step, setStep]         = useState(0);
  const [flash, setFlash]       = useState(false);
  const [burnFlash, setBurnFlash] = useState(false);
  const [chat, setChat]         = useState<ChatLine[]>([]);
  const [lockedBet, setLockedBet] = useState(0);
  const chatIdRef               = useRef(0);
  const chatTimerRef            = useRef<ReturnType<typeof setInterval> | null>(null);

  const multiplier = getMultiplier(step);
  const nextBurnChance = getBurnChance(step + 1);
  const payout = Math.floor(lockedBet * multiplier);
  const isActive = phase === "running" || phase === "stepping";
  const isDone   = phase === "burned" || phase === "escaped";

  function addChat(step: number) {
    const danger = getBurnChance(step) > 0.45;
    const pool = danger ? STOP_CHAT : SAFE_CHAT;
    const line: ChatLine = {
      id: ++chatIdRef.current,
      user: rnd(USERNAMES),
      text: rnd(pool),
      danger,
    };
    setChat((c) => [...c.slice(-5), line]);
  }

  function startGame() {
    if (balance <= 0) return;
    const b = Math.min(bet, balance);
    setLockedBet(b);
    setStep(0);
    setChat([]);
    setPhase("running");
    addChat(1);
    chatTimerRef.current = setInterval(() => {
      setStep((s) => { addChat(s + 1); return s; });
    }, 2200);
  }

  function stopChat() {
    if (chatTimerRef.current) { clearInterval(chatTimerRef.current); chatTimerRef.current = null; }
  }

  useEffect(() => () => stopChat(), []);

  const doStep = useCallback(() => {
    if (phase !== "running") return;
    setPhase("stepping");

    const nextStep = step + 1;
    const burnChance = getBurnChance(nextStep);
    const burned = Math.random() < burnChance;

    // Flash regardless
    setFlash(true);
    setTimeout(() => setFlash(false), 350);

    setTimeout(() => {
      if (burned) {
        setBurnFlash(true);
        stopChat();
        setStep(nextStep);
        setPhase("burned");
        onResult(-lockedBet);
        setTimeout(() => setBurnFlash(false), 800);
      } else {
        setStep(nextStep);
        addChat(nextStep);
        setPhase("running");
      }
    }, 400);
  }, [phase, step, lockedBet, onResult]);

  function collect() {
    if (phase !== "running") return;
    stopChat();
    setPhase("escaped");
    onResult(Math.floor(lockedBet * multiplier) - lockedBet);
  }

  function reset() {
    setPhase("idle");
    setStep(0);
    setChat([]);
    setLockedBet(0);
  }

  /* ── Render corridor rows ──────────── */
  const VISIBLE = 6;
  const rows: { step: number; status: "passed"|"current"|"danger"|"far" }[] = [];

  if (isActive || isDone) {
    // Show from max(1, step-1) to step + visible_ahead
    const start = Math.max(1, step - 1);
    const end   = start + VISIBLE - 1;
    for (let s = start; s <= end; s++) {
      rows.push({
        step: s,
        status: s < step ? "passed" : s === step ? "current" : s === step + 1 ? "danger" : "far",
      });
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200 relative">
      {/* Burn flash overlay */}
      {burnFlash && (
        <div className="fixed inset-0 z-50 pointer-events-none"
          style={{ background: "rgba(239,68,68,0.28)", animation: "breathe 0.3s ease-in-out 3" }}
        />
      )}

      {/* Step flash */}
      {flash && !burnFlash && (
        <div className="fixed inset-0 z-40 pointer-events-none"
          style={{ background: "rgba(99,102,241,0.15)", animation: "breathe 0.15s ease-out 2" }}
        />
      )}

      {/* Idle / result orb */}
      {!isActive && (
        <div className="flex flex-col items-center justify-center gap-3 py-5 relative">
          {phase === "idle" && (
            <>
              <div className="absolute w-40 h-40 rounded-full border border-red-500/15 anim-ripple" />
              <div className="w-40 h-40 rounded-full flex flex-col items-center justify-center gap-1 anim-bob"
                style={{ background: "linear-gradient(135deg,#7f1d1d 0%,#1f2937 100%)", boxShadow: "0 0 30px rgba(239,68,68,0.2)" }}>
                <div className="text-5xl" style={{ animationDelay: "0.2s" }}>⚡</div>
              </div>
              <div className="text-white/25 text-sm text-center">
                Поставь ставку и беги через лазеры.<br/>
                <span className="text-white/15 text-xs">Каждый шаг повышает награду и риск!</span>
              </div>
            </>
          )}
          {phase === "burned" && (
            <>
              <div className="w-40 h-40 rounded-full flex flex-col items-center justify-center gap-1 animate-in zoom-in duration-300"
                style={{ background: "linear-gradient(135deg,#dc2626 0%,#7f1d1d 100%)", boxShadow: "0 0 60px rgba(239,68,68,0.7)" }}>
                <div className="text-4xl mb-1" style={{ animation: "bob 0.35s ease-in-out infinite" }}>⚡</div>
                <span className="text-5xl font-black text-white">{getMultiplier(step).toFixed(2)}x</span>
                <span className="text-red-200/80 text-[10px] uppercase tracking-widest">СГОРЕЛ</span>
              </div>
              <div className="text-center">
                <div className="text-red-400 font-bold">Лазер сработал на зоне {step}</div>
                <div className="text-white/40 text-sm mt-0.5">Потеряно {lockedBet} ⭐</div>
              </div>
            </>
          )}
          {phase === "escaped" && (
            <>
              <div className="w-40 h-40 rounded-full flex flex-col items-center justify-center gap-1 animate-in zoom-in duration-300"
                style={{ background: "linear-gradient(135deg,#16a34a 0%,#065f46 100%)", boxShadow: "0 0 60px rgba(34,197,94,0.7)" }}>
                <div className="text-4xl mb-1 animate-[spark-in_0.5s_ease-out]">🏆</div>
                <span className="text-5xl font-black text-white">{multiplier.toFixed(2)}x</span>
                <span className="text-green-200/80 text-[10px] uppercase tracking-widest">СБЕЖАЛ</span>
              </div>
              <div className="text-center">
                <div className="text-green-400 font-bold">Прошёл {step} зон{step === 1 ? "у" : step < 5 ? "ы" : ""} · забрал {payout} ⭐</div>
                <div className="text-white/40 text-sm mt-0.5">
                  {payout > lockedBet ? `+${payout - lockedBet} прибыль` : payout === lockedBet ? "в ноль" : `-${lockedBet - payout} убыток`}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Active corridor */}
      {isActive && (
        <div className="mx-4 mt-3 mb-2 space-y-1.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-white/50 uppercase tracking-widest">⚡ Лазерный коридор</span>
            <span className="text-xs font-bold text-violet-300">Зона {step} · {multiplier.toFixed(2)}x</span>
          </div>
          {rows.map((r) => (
            <LaserRow
              key={r.step}
              step={r.step}
              status={r.status}
              burnChance={getBurnChance(r.step)}
              flash={flash}
            />
          ))}
          {/* Next step risk indicator */}
          {phase === "running" && (
            <div className="flex items-center justify-center gap-2 pt-1">
              <span className="text-[10px] text-white/30">Следующий шаг:</span>
              <span className={`text-[10px] font-black ${nextBurnChance > 0.5 ? "text-red-400 animate-pulse" : "text-amber-400"}`}>
                {Math.round(nextBurnChance * 100)}% шанс сгореть
              </span>
            </div>
          )}
        </div>
      )}

      {/* Chat strip (only during active game) */}
      {isActive && chat.length > 0 && (
        <div className="mx-4 mb-2 rounded-xl border border-white/8 bg-white/3 px-3 py-1.5 space-y-0.5 max-h-[64px] overflow-hidden">
          {chat.slice(-3).map((m) => (
            <div key={m.id} className="flex gap-1 items-baseline text-xs leading-tight animate-in slide-in-from-bottom-1 fade-in duration-150">
              <span className={`font-bold shrink-0 ${m.danger ? "text-red-400" : "text-cyan-400"}`}>{m.user}:</span>
              <span className={m.danger ? "text-red-300 font-semibold" : "text-white/70"}>{m.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="px-4 pb-3 space-y-3">
        {phase === "idle" && (
          <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
            <BetInput bet={bet} balance={balance} disabled={false} onChange={setBet} />
          </div>
        )}

        {phase === "idle" && balance === 0 && (
          <button onClick={onBuyStars}
            className="w-full py-4 rounded-2xl font-black text-lg tracking-wide text-white relative overflow-hidden active:scale-95 transition-transform"
            style={{ background: "linear-gradient(90deg,#7c3aed,#a855f7,#7c3aed)", backgroundSize: "200% 100%", animation: "shimmer-slide 2s linear infinite", boxShadow: "0 0 20px rgba(168,85,247,0.4)" }}>
            ⭐ Купить звёзды для игры
          </button>
        )}

        {phase === "idle" && balance > 0 && (
          <button onClick={startGame}
            disabled={bet <= 0 || bet > balance}
            className="w-full py-4 rounded-2xl font-black text-xl tracking-wide text-white relative overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
            style={{ background: "linear-gradient(90deg,#7f1d1d,#dc2626,#7f1d1d)", backgroundSize: "300% 100%", animation: "shimmer-slide 3s linear infinite", boxShadow: "0 0 24px rgba(239,68,68,0.5)" }}>
            ⚡ ВОЙТИ В КОРИДОР
          </button>
        )}

        {phase === "running" && (
          <div className="flex gap-2">
            <button onClick={doStep}
              className="flex-1 py-4 rounded-2xl font-black text-lg tracking-wide text-white active:scale-95 transition-all duration-150 relative overflow-hidden"
              style={{
                background: nextBurnChance > 0.5
                  ? "linear-gradient(90deg,#7f1d1d,#ef4444,#7f1d1d)"
                  : "linear-gradient(90deg,#7f1d1d,#dc2626,#7f1d1d)",
                backgroundSize: "200% 100%",
                animation: "shimmer-slide 1.2s linear infinite",
                boxShadow: nextBurnChance > 0.5 ? "0 0 30px rgba(239,68,68,0.8)" : "0 0 20px rgba(239,68,68,0.5)",
              }}>
              ⚡ ЕЩЁ ШАГ
              <div className="text-[11px] font-normal opacity-70 mt-0.5">риск {Math.round(nextBurnChance * 100)}%</div>
            </button>
            <button onClick={collect}
              className="flex-1 py-4 rounded-2xl font-black text-lg tracking-wide text-white active:scale-95 transition-all duration-150"
              style={{ background: "linear-gradient(90deg,#15803d,#22c55e,#15803d)", backgroundSize: "200% 100%", animation: "shimmer-slide 1.5s linear infinite", boxShadow: "0 0 22px rgba(34,197,94,0.55)" }}>
              💰 ЗАБРАТЬ
              <div className="text-[11px] font-normal opacity-80 mt-0.5">{payout} ⭐</div>
            </button>
          </div>
        )}

        {phase === "stepping" && (
          <button disabled
            className="w-full py-4 rounded-2xl font-black text-xl text-white/50 bg-white/5 border border-white/10 cursor-not-allowed">
            ⚡ СКАНИРОВАНИЕ...
          </button>
        )}

        {isDone && (
          <button onClick={reset}
            className="w-full py-4 rounded-2xl font-black text-xl bg-white/10 border border-white/20 text-white hover:bg-white/15 active:scale-95 transition-all animate-in fade-in slide-in-from-bottom-2 duration-300">
            Войти снова
          </button>
        )}
      </div>
    </div>
  );
}
