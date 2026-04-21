import { useState, useEffect, useRef } from "react";
import { useGameState } from "@/hooks/useGameState";
import { ViewerCounter } from "@/components/ViewerCounter";
import { ChatBox } from "@/components/ChatBox";
import { BetInput } from "@/components/BetInput";
import { PlayerProfilePanel } from "@/components/PlayerProfile";
import { ReferralPanel } from "@/components/ReferralPanel";
import { DailyTasks } from "@/components/DailyTasks";
import { HypeModeOverlay } from "@/components/HypeModeOverlay";
import StarShop from "@/components/StarShop";
import BankHeistView from "@/components/BankHeistView";
import LaserCorridorView from "@/components/LaserCorridorView";
import { formatBalance, formatMultiplier } from "@/lib/gameLogic";

const BASE = import.meta.env.BASE_URL;

function getTelegramUserId(): string {
  return String((window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id ?? "test_user");
}

async function registerReferral(referrerId: string, newUserId: string) {
  const key = `ref_registered_${newUserId}`;
  if (localStorage.getItem(key)) return;
  try {
    await fetch(`${BASE}api/referral/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referrerId, newUserId }),
    });
    localStorage.setItem(key, "1");
  } catch {}
}

type Tab = "games" | "profile" | "tasks" | "shop" | "friends";
type ActiveGame = "stream" | "bank" | "laser";

/* ── Floating background particles ─────────────── */
type Particle = { id: number; x: number; size: number; delay: number; duration: number; color: string };
const PARTICLE_COLORS = [
  "rgba(6,182,212,0.5)", "rgba(168,85,247,0.5)", "rgba(236,72,153,0.4)",
  "rgba(6,182,212,0.3)", "rgba(99,102,241,0.4)",
];
function generateParticles(n: number): Particle[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: 2 + Math.random() * 3,
    delay: Math.random() * 4,
    duration: 3 + Math.random() * 4,
    color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
  }));
}
const PARTICLES = generateParticles(14);

function BackgroundParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {PARTICLES.map((p) => (
        <div
          key={p.id}
          className="absolute bottom-0 rounded-full"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            animation: `float-up ${p.duration}s ${p.delay}s ease-out infinite`,
            filter: "blur(0.5px)",
          }}
        />
      ))}
    </div>
  );
}

/* ── Satellite dot that orbits the orb ─────────── */
function OrbitDot({ radius, color, animClass, dotSize = 8 }: {
  radius: number; color: string; animClass: string; dotSize?: number;
}) {
  return (
    <div
      className={`absolute rounded-full pointer-events-none ${animClass}`}
      style={{
        width: radius * 2,
        height: radius * 2,
        top: "50%",
        left: "50%",
        marginTop: -radius,
        marginLeft: -radius,
      }}
    >
      <div
        className="absolute rounded-full"
        style={{
          width: dotSize,
          height: dotSize,
          top: 0,
          left: "50%",
          marginLeft: -dotSize / 2,
          marginTop: -dotSize / 2,
          background: color,
          boxShadow: `0 0 8px ${color}, 0 0 18px ${color}`,
        }}
      />
    </div>
  );
}

/* ── Rocket launch track ────────────────────────── */
const MILESTONES = [
  { value: 1.5, label: "x1.5" },
  { value: 2,   label: "x2"   },
  { value: 4,   label: "x4"   },
  { value: 8,   label: "x8"   },
  { value: 16,  label: "x16"  },
];
const MAX_LOG = Math.log(25);
function multToHeightPct(m: number): number {
  return Math.min((Math.log(Math.max(m, 1.001)) / MAX_LOG) * 100, 93);
}
// stable exhaust positions generated once
const EXHAUST = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  xOff: (((i * 73) % 40) - 20),
  size: 3 + (i % 3) * 2,
  delay: (i * 0.13).toFixed(2),
}));

function RocketTrack({ multiplier, hypeMode, dangerZone }: {
  multiplier: number; hypeMode: boolean; dangerZone: boolean;
}) {
  const pct = multToHeightPct(multiplier);

  const trailHex  = hypeMode ? "#ec4899" : dangerZone ? "#22c55e" : "#06b6d4";
  const glowRgba  = hypeMode ? "rgba(236,72,153,0.95)" : dangerZone ? "rgba(34,197,94,0.95)" : "rgba(6,182,212,0.95)";
  const labelCls  = hypeMode ? "text-pink-300" : dangerZone ? "text-green-300" : "text-cyan-300";

  // multiplier label: keep it above rocket but within container
  const labelBottomPct = Math.min(pct + 14, 80);

  return (
    <div className="relative w-full select-none" style={{ height: 175 }}>

      {/* Milestone tick lines */}
      {MILESTONES.map(({ value, label }) => {
        const mPct  = multToHeightPct(value);
        const passed = multiplier >= value;
        return (
          <div
            key={value}
            className="absolute w-full flex items-center px-5 gap-2 pointer-events-none"
            style={{ bottom: `${mPct}%` }}
          >
            <span className={`text-[10px] font-bold w-7 text-right shrink-0 transition-colors duration-300 ${passed ? labelCls : "text-white/12"}`}>
              {label}
            </span>
            <div
              className="flex-1 h-px transition-all duration-500"
              style={{ background: passed ? trailHex : "rgba(255,255,255,0.05)", opacity: passed ? 0.45 : 1 }}
            />
          </div>
        );
      })}

      {/* Glowing trail from bottom to rocket */}
      <div
        className="absolute pointer-events-none transition-[height] duration-75"
        style={{
          left: "50%",
          transform: "translateX(-50%)",
          bottom: 0,
          width: 5,
          height: `${pct}%`,
          borderRadius: 9999,
          background: `linear-gradient(to top, ${trailHex}dd 0%, ${trailHex}55 60%, transparent 100%)`,
          boxShadow: `0 0 12px ${trailHex}88, 0 0 28px ${trailHex}44`,
        }}
      />

      {/* Exhaust ring burst at rocket base */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: "50%",
          bottom: `${pct}%`,
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: `2px solid ${trailHex}`,
          animation: "exhaust-ring 0.7s ease-out infinite",
        }}
      />

      {/* Smoke particles floating up from exhaust */}
      {EXHAUST.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `calc(50% + ${p.xOff}px)`,
            bottom: `${Math.max(pct - 5, 0)}%`,
            width: p.size,
            height: p.size,
            background: trailHex,
            opacity: 0.55,
            filter: "blur(1px)",
            animation: `float-up 0.9s ${p.delay}s ease-out infinite`,
          }}
        />
      ))}

      {/* The rocket 🚀 */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: "50%",
          bottom: `${pct}%`,
          fontSize: 42,
          lineHeight: 1,
          animation: "rocket-wobble 0.7s ease-in-out infinite",
          filter: `drop-shadow(0 0 10px ${glowRgba}) drop-shadow(0 0 22px ${glowRgba}66)`,
          transition: "bottom 75ms linear",
        }}
      >
        🚀
      </div>

      {/* Multiplier number floats above rocket */}
      <div
        className="absolute pointer-events-none flex flex-col items-center"
        style={{
          left: "50%",
          bottom: `${labelBottomPct}%`,
          transform: "translateX(-50%)",
          transition: "bottom 75ms linear",
        }}
      >
        <span
          className="font-black tabular-nums text-white drop-shadow-lg"
          style={{ fontSize: multiplier >= 10 ? 30 : 36 }}
        >
          {formatMultiplier(multiplier)}
        </span>
        <span className={`text-[10px] font-semibold uppercase tracking-widest animate-pulse ${labelCls}`}>
          {hypeMode ? "🔥 ХАЙП" : dangerZone ? "🚀 ДАВАЙ ВЫШЕ" : "В ЭФИРЕ"}
        </span>
      </div>
    </div>
  );
}

/* ── Multiplier orb (idle / crashed / collected) ── */
function MultiplierOrb({
  phase, multiplier, collectedAmount, bet,
}: {
  phase: string; multiplier: number; collectedAmount: number; bet: number;
}) {
  const isCrashed   = phase === "crashed";
  const isCollected = phase === "collected";
  const isIdle      = phase === "idle";

  let orbColor  = "from-cyan-500 to-blue-600";
  let glowColor = "rgba(6,182,212,0.5)";

  if (isCrashed)       { orbColor = "from-red-600 to-red-900";       glowColor = "rgba(239,68,68,0.6)"; }
  else if (isCollected){ orbColor = "from-green-500 to-emerald-700"; glowColor = "rgba(34,197,94,0.6)"; }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6 relative">
      {/* Ripple rings when idle */}
      {isIdle && (
        <>
          <div className="absolute w-44 h-44 rounded-full border border-cyan-500/15 anim-ripple" />
          <div className="absolute w-44 h-44 rounded-full border border-purple-500/15 anim-ripple-delay" />
        </>
      )}

      {/* Main orb */}
      <div
        className={`relative w-44 h-44 rounded-full bg-gradient-to-br ${orbColor} flex flex-col items-center justify-center transition-all duration-300 ${isIdle ? "anim-bob" : ""}`}
        style={{
          boxShadow: isCrashed || isCollected
            ? `0 0 60px ${glowColor}, 0 0 120px ${glowColor}50`
            : isIdle ? "0 0 30px rgba(6,182,212,0.12)"
            : "none",
        }}
      >
        {isCrashed   && <div className="text-3xl mb-1 animate-bounce">💀</div>}
        {isCollected && <div className="text-3xl mb-1 animate-[spark-in_0.6s_ease-out]">💰</div>}
        {isIdle      && <div className="text-5xl anim-bob" style={{ animationDelay: "0.3s" }}>🚀</div>}

        {(isCrashed || isCollected) && (
          <span className={`font-black tabular-nums ${multiplier >= 10 ? "text-4xl" : "text-5xl"} text-white drop-shadow-lg`}>
            {formatMultiplier(multiplier)}
          </span>
        )}
        {isCrashed   && <span className="text-red-200/80   text-xs mt-1 uppercase tracking-widest">КРАШ</span>}
        {isCollected && <span className="text-green-200/80 text-xs mt-1 uppercase tracking-widest">ЗАБРАЛ</span>}
      </div>

      {isCrashed && (
        <div className="text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="text-red-400 font-bold text-base">Стрим упал на {formatMultiplier(multiplier)}</div>
          <div className="text-white/40 text-sm mt-0.5">Потеряно {bet} ⭐</div>
        </div>
      )}

      {isCollected && (
        <div className="text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="text-green-400 font-bold text-base">Забрал {collectedAmount} ⭐</div>
          <div className="text-white/40 text-sm mt-0.5">
            {collectedAmount > bet ? `+${collectedAmount - bet} прибыль`
              : collectedAmount === bet ? "в ноль"
              : `-${bet - collectedAmount} убыток`}
          </div>
        </div>
      )}

      {isIdle && (
        <div className="text-white/25 text-sm text-center animate-in fade-in duration-500">
          Сделай ставку и выходи в эфир.<br />
          <span className="text-white/15 text-xs">Забери деньги до краша!</span>
        </div>
      )}
    </div>
  );
}

/* ── Animated balance display ───────────────────── */
function AnimatedBalance({ balance }: { balance: number }) {
  const prevRef    = useRef(balance);
  const [flashCls, setFlashCls] = useState("");

  useEffect(() => {
    if (balance === prevRef.current) return;
    const cls = balance > prevRef.current ? "anim-balance-up" : "anim-balance-down";
    prevRef.current = balance;
    setFlashCls(cls);
    const t = setTimeout(() => setFlashCls(""), 750);
    return () => clearTimeout(t);
  }, [balance]);

  return (
    <span className={`text-2xl font-black tabular-nums transition-colors duration-300 ${flashCls}`}>
      {formatBalance(balance)}
    </span>
  );
}

/* ── Main game screen ───────────────────────────── */
export default function Game() {
  const [tab, setTab]             = useState<Tab>("games");
  const [activeGame, setActiveGame] = useState<ActiveGame>("stream");
  const { state, goLive, collect, reset, setBet, claimFreeReward, addCredits } = useGameState();
  const myUserId = getTelegramUserId();

  useEffect(() => {
    // Try URL search param first (?ref=REFERRER_ID) — set by bot handler
    const urlRef = new URLSearchParams(window.location.search).get("ref") ?? "";
    // Fallback: Telegram start_param for startapp deep links
    const startParam: string = (window as any).Telegram?.WebApp?.initDataUnsafe?.start_param ?? "";
    const tgRef = startParam.startsWith("ref_") ? startParam.slice(4) : "";

    const referrerId = urlRef || tgRef;
    if (referrerId && referrerId !== myUserId) {
      registerReferral(referrerId, myUserId);
    }
  }, []);

  const {
    phase, profile, currentBet, currentMultiplier, messages,
    hypeMode, dangerZone, shaking, tasks, freeRewardReady, collectedAmount,
    quickCollectStreak,
  } = state;

  const isLive = phase === "live";
  const isDone = phase === "crashed" || phase === "collected";

  // Reset game when switching games
  function switchGame(g: ActiveGame) {
    if (phase === "live") return;
    reset();
    setActiveGame(g);
  }

  const TAB_LABELS: Record<Tab, string> = {
    games: "🎮 Игры",
    profile: "👤 Профиль",
    tasks: "📋 Задания",
    shop: "⭐ Магазин",
    friends: "👥 Друзья",
  };

  return (
    <div
      className={`min-h-screen bg-[#0a0a0f] text-white flex flex-col max-w-md mx-auto relative overflow-hidden ${
        shaking ? "animate-[shake_0.5s_ease-in-out]" : ""
      }`}
    >
      <style>{`
        @keyframes shake {
          0%,100%{transform:translate(0,0) rotate(0deg)}
          15%{transform:translate(-5px,2px) rotate(-1.5deg)}
          30%{transform:translate(6px,-2px) rotate(1deg)}
          45%{transform:translate(-5px,2px) rotate(-0.8deg)}
          60%{transform:translate(5px,-1px) rotate(0.8deg)}
          75%{transform:translate(-4px,2px) rotate(-0.5deg)}
          90%{transform:translate(3px,-1px) rotate(0.3deg)}
        }
        ::-webkit-scrollbar{display:none}
      `}</style>

      <BackgroundParticles />
      <HypeModeOverlay active={hypeMode} />

      {/* Шапка */}
      <div className="flex items-center justify-between px-4 pt-3 pb-3 border-b border-white/10 relative z-30">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black transition-all duration-300 ${
              hypeMode
                ? "bg-pink-500 shadow-[0_0_14px_rgba(236,72,153,0.8)] animate-pulse"
                : "bg-gradient-to-br from-cyan-500 to-purple-600 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
            }`}
          >
            SR
          </div>
          <span className={`font-black text-lg tracking-tight ${hypeMode ? "text-pink-300" : "text-white"}`}>
            StreamRush
          </span>
        </div>
        <ViewerCounter viewers={profile.viewers} hypeMode={hypeMode} />
      </div>

      {/* Баланс */}
      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-white/3 border-b border-white/5 relative z-10">
        <span className={`text-yellow-400 ${hypeMode ? "animate-spin" : ""}`} style={hypeMode ? {animationDuration: "2s"} : {}}>⭐</span>
        <AnimatedBalance balance={profile.balance} />
        <span className="text-white/30 text-sm">Звёзды</span>
      </div>

      {/* Табы */}
      <div className="flex border-b border-white/10 relative z-20">
        {([
          { id: "games",   icon: "🎮", label: "Игры"    },
          { id: "profile", icon: "👤", label: "Профиль" },
          { id: "tasks",   icon: "📋", label: "Задания" },
          { id: "friends", icon: "👥", label: "Друзья",  pulse: true },
          { id: "shop",    icon: "⭐", label: "Магазин" },
        ] as { id: Tab; icon: string; label: string; pulse?: boolean }[]).map(({ id, icon, label, pulse }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2 flex flex-col items-center gap-0.5 transition-all duration-200 relative ${
              tab === id
                ? `border-b-2 ${hypeMode ? "border-pink-500 text-pink-300" : "border-cyan-500 text-cyan-300"}`
                : "text-white/30 hover:text-white/60 border-b-2 border-transparent"
            }`}
          >
            <span className="text-base leading-none">{icon}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wide">{label}</span>
            {pulse && tab !== id && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* Контент */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-20">
        {tab === "games" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Game selector */}
            <div className="flex gap-1.5 px-4 pt-3 pb-2">
              {([
                { id: "stream", label: "🚀 Стрим",    active: "bg-cyan-500/20 border-cyan-500/50 text-cyan-300" },
                { id: "bank",   label: "🏦 Банк",     active: "bg-amber-500/20 border-amber-500/50 text-amber-300" },
                { id: "laser",  label: "⚡ Лазер",    active: "bg-red-500/20 border-red-500/50 text-red-300" },
              ] as const).map(({ id, label, active }) => (
                <button
                  key={id}
                  onClick={() => switchGame(id)}
                  disabled={phase === "live"}
                  className={`flex-1 py-2 rounded-xl text-[11px] font-bold flex items-center justify-center transition-all duration-200 active:scale-95 disabled:cursor-not-allowed border ${
                    activeGame === id
                      ? active
                      : "bg-white/5 border-white/10 text-white/35 hover:text-white/60"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Bank Heist game */}
            {activeGame === "bank" && (
              <BankHeistView
                state={state}
                goLive={goLive}
                collect={collect}
                reset={reset}
                setBet={setBet}
                onBuyStars={() => setTab("shop")}
              />
            )}

            {/* Laser Corridor game */}
            {activeGame === "laser" && (
              <LaserCorridorView
                balance={profile.balance}
                bet={currentBet}
                setBet={setBet}
                onResult={(delta) => addCredits(delta)}
                onBuyStars={() => setTab("shop")}
              />
            )}

            {/* StreamRush game */}
            {activeGame === "stream" && (
          <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
            {phase === "live" ? (
              <RocketTrack
                multiplier={currentMultiplier}
                hypeMode={hypeMode}
                dangerZone={dangerZone}
              />
            ) : (
              <MultiplierOrb
                phase={phase}
                multiplier={currentMultiplier}
                collectedAmount={collectedAmount}
                bet={currentBet}
              />
            )}

            {/* Live: viewers + compact chat right below the track */}
            {isLive && (
              <div className="mx-4 mb-2 rounded-2xl border border-white/10 bg-white/3 overflow-hidden">
                {/* Viewers bar */}
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/8">
                  <span className={`text-xs font-bold ${hypeMode ? "text-pink-400" : "text-cyan-400"}`}>
                    {hypeMode ? "🔥" : "👥"} {profile.viewers.toLocaleString("ru")} зрителей
                  </span>
                  <div className="flex-1" />
                  <span className="text-white/30 text-[10px]">
                    Ставка {currentBet} ⭐ → {Math.floor(currentBet * currentMultiplier)} ⭐
                  </span>
                </div>
                {/* Last 3 chat messages */}
                <div className="px-3 py-1.5 space-y-1 max-h-[72px] overflow-hidden">
                  {messages.length === 0 ? (
                    <p className="text-white/20 text-xs text-center py-1">Зрители подтягиваются…</p>
                  ) : (
                    messages.slice(-3).map((msg) => {
                      const TYPE_COLORS: Record<string, string> = {
                        hype: "text-yellow-400", realist: "text-blue-300",
                        troll: "text-red-400", lucky: "text-green-400", system: "text-purple-400",
                      };
                      const USERNAME_COLORS = [
                        "text-cyan-400","text-pink-400","text-orange-400",
                        "text-emerald-400","text-violet-400","text-amber-400",
                      ];
                      let h = 0;
                      for (const c of msg.username) h = (h * 31 + c.charCodeAt(0)) >>> 0;
                      const uColor = USERNAME_COLORS[h % USERNAME_COLORS.length];
                      return (
                        <div key={msg.id} className="flex gap-1 items-baseline text-xs leading-tight animate-in slide-in-from-bottom-1 fade-in duration-200">
                          <span className={`font-semibold shrink-0 ${uColor}`}>{msg.username}:</span>
                          <span className={TYPE_COLORS[msg.type] ?? "text-white/70"}>{msg.text}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <div className="px-4 pb-3 space-y-3">

              {phase === "idle" && (
                <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
                  <BetInput
                    bet={currentBet}
                    balance={profile.balance}
                    disabled={false}
                    onChange={setBet}
                  />
                </div>
              )}

              {phase === "idle" && profile.balance === 0 && (
                <button
                  onClick={() => setTab("shop")}
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
                    background: "linear-gradient(90deg, #0891b2, #2563eb, #7c3aed, #0891b2)",
                    backgroundSize: "300% 100%",
                    animation: "shimmer-slide 3s linear infinite",
                    boxShadow: "0 0 24px rgba(6,182,212,0.45)",
                  }}
                >
                  🔴 ВЫЙТИ В ЭФИР
                </button>
              )}

              {isLive && (
                <button
                  onClick={collect}
                  className={`w-full py-5 rounded-2xl font-black text-2xl tracking-wide text-white active:scale-95 transition-all duration-150 relative overflow-hidden ${
                    hypeMode
                      ? "shadow-[0_0_35px_rgba(236,72,153,0.8)]"
                      : dangerZone
                      ? "shadow-[0_0_35px_rgba(34,197,94,0.8)]"
                      : "shadow-[0_0_22px_rgba(34,197,94,0.5)]"
                  }`}
                  style={{
                    background: hypeMode
                      ? "linear-gradient(90deg,#be185d,#7e22ce,#be185d)"
                      : dangerZone
                      ? "linear-gradient(90deg,#15803d,#22c55e,#15803d)"
                      : "linear-gradient(90deg,#16a34a,#059669,#16a34a)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer-slide 1.5s linear infinite",
                  }}
                >
                  💰 ЗАБРАТЬ {formatMultiplier(currentMultiplier)}
                  <div className="text-sm font-normal opacity-80 mt-0.5">
                    = {Math.floor(currentBet * currentMultiplier)} ⭐
                  </div>
                </button>
              )}

              {isDone && (
                <button
                  onClick={reset}
                  className="w-full py-4 rounded-2xl font-black text-xl bg-white/10 border border-white/20 text-white hover:bg-white/15 active:scale-95 transition-all animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  Играть снова
                </button>
              )}

            </div>

            {isDone && (
              <div className="flex-1 mx-4 mb-4 rounded-2xl border border-white/10 bg-white/3 overflow-hidden min-h-[140px]">
                <ChatBox messages={messages} hypeMode={hypeMode} />
              </div>
            )}
          </div>
            )}
          </div>
        )}

        {tab === "profile" && (
          <div className="p-4 overflow-y-auto animate-in fade-in slide-in-from-right-4 duration-200 space-y-4">
            <PlayerProfilePanel profile={profile} />
          </div>
        )}

        {tab === "friends" && (
          <div className="p-4 overflow-y-auto animate-in fade-in slide-in-from-right-4 duration-200 space-y-4">
            {/* Hero banner */}
            <div className="rounded-3xl overflow-hidden relative"
              style={{ background: "linear-gradient(135deg, #0e7490 0%, #6d28d9 100%)" }}>
              <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 0%, transparent 60%)" }} />
              <div className="relative p-5 flex flex-col gap-2">
                <div className="text-3xl">🤝</div>
                <div className="text-white font-black text-xl leading-tight">Пригласи друга —<br/>получай звёзды!</div>
                <div className="text-white/70 text-sm">5% от каждой покупки твоих рефералов</div>
              </div>
            </div>
            <ReferralPanel userId={myUserId} />
          </div>
        )}

        {tab === "tasks" && (
          <div className="p-4 overflow-y-auto animate-in fade-in slide-in-from-right-4 duration-200">
            <DailyTasks
              tasks={tasks}
              freeRewardReady={freeRewardReady}
              onClaimFreeReward={claimFreeReward}
            />
          </div>
        )}

        {tab === "shop" && (
          <div className="overflow-y-auto animate-in fade-in slide-in-from-right-4 duration-200">
            <StarShop onCreditsReceived={addCredits} />
          </div>
        )}
      </div>
    </div>
  );
}
