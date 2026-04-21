import { useEffect, useRef, useState } from "react";
import { PlayerProfile as Profile, RANKS } from "@/lib/gameLogic";
import { formatMultiplier } from "@/lib/gameLogic";

/* ── Animated counter ─────────────────────────── */
function AnimCount({ value, suffix = "" }: { value: number | undefined; suffix?: string }) {
  const safe = value ?? 0;
  const [display, setDisplay] = useState(safe);
  const prev = useRef(safe);
  useEffect(() => {
    if (safe === prev.current) return;
    const diff = safe - prev.current;
    const steps = 20;
    let i = 0;
    const t = setInterval(() => {
      i++;
      setDisplay(Math.round(prev.current + (diff * i) / steps));
      if (i >= steps) { clearInterval(t); prev.current = safe; }
    }, 18);
    return () => clearInterval(t);
  }, [safe]);
  return <>{display.toLocaleString("ru")}{suffix}</>;
}

/* ── Rank config ──────────────────────────────── */
const RANK_STYLE: Record<string, {
  gradient: string; glow: string; badge: string; icon: string; textCls: string;
}> = {
  "Безызвестный":      { gradient: "from-gray-700 to-gray-900",        glow: "rgba(156,163,175,0.35)", badge: "bg-gray-600/40 text-gray-300 border-gray-500/40", icon: "🎮", textCls: "text-gray-300" },
  "Малый стример":     { gradient: "from-blue-700 to-blue-900",         glow: "rgba(59,130,246,0.45)",  badge: "bg-blue-600/30 text-blue-300 border-blue-500/40",  icon: "📡", textCls: "text-blue-300"  },
  "Восходящая звезда": { gradient: "from-violet-600 to-purple-900",     glow: "rgba(139,92,246,0.5)",   badge: "bg-violet-600/30 text-violet-300 border-violet-500/40", icon: "🌟", textCls: "text-violet-300" },
  "Вирусный":          { gradient: "from-pink-600 to-rose-900",         glow: "rgba(236,72,153,0.55)",  badge: "bg-pink-600/30 text-pink-300 border-pink-500/40",   icon: "🔥", textCls: "text-pink-300"   },
  "Топ-стример":       { gradient: "from-yellow-500 to-orange-700",     glow: "rgba(234,179,8,0.6)",    badge: "bg-yellow-500/30 text-yellow-300 border-yellow-500/40", icon: "👑", textCls: "text-yellow-300" },
};
function rankStyle(rank: string) {
  return RANK_STYLE[rank] ?? RANK_STYLE["Безызвестный"];
}

/* ── Stat card ────────────────────────────────── */
function StatCard({ icon, label, value, sub, color }: {
  icon: string; label: string; value: React.ReactNode; sub?: string; color: string;
}) {
  return (
    <div className={`rounded-2xl p-3 border bg-white/4 border-white/8 flex flex-col gap-0.5 relative overflow-hidden`}>
      <div className="text-xl leading-none mb-1">{icon}</div>
      <div className={`font-black text-lg leading-tight tabular-nums ${color}`}>{value}</div>
      <div className="text-white/40 text-[10px] uppercase tracking-wider">{label}</div>
      {sub && <div className="text-white/20 text-[9px]">{sub}</div>}
    </div>
  );
}

/* ── Main export ──────────────────────────────── */
export function PlayerProfilePanel({ profile }: { profile: Profile }) {
  const rs = rankStyle(profile.rank);

  const currentRankIdx = RANKS.findIndex((r) => r.name === profile.rank);
  const nextRank   = RANKS[currentRankIdx + 1];
  const prevRating = RANKS[currentRankIdx]?.minRating ?? 0;
  const nextRating = nextRank?.minRating;
  const progress   = nextRating
    ? Math.min(((profile.rating - prevRating) / (nextRating - prevRating)) * 100, 100)
    : 100;

  return (
    <div className="space-y-4 pb-4">

      {/* ── Channel banner ── */}
      <div className="relative rounded-3xl overflow-hidden" style={{ minHeight: 180 }}>
        {/* Animated gradient bg */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${rs.gradient.replace("from-","").replace("to-","")})`,
            backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))`,
          }}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${rs.gradient} opacity-90`} />
          {/* Shimmer scan line */}
          <div className="absolute inset-0 overflow-hidden opacity-30">
            <div className="absolute w-full h-px bg-white/60 top-1/4 animate-[shimmer-slide_3s_linear_infinite]"
              style={{ backgroundSize: "200% 100%" }} />
            <div className="absolute w-full h-px bg-white/40 top-2/3 animate-[shimmer-slide_4s_linear_infinite_reverse]" />
          </div>
          {/* Glow orb */}
          <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full opacity-25"
            style={{ background: `radial-gradient(circle, white 0%, transparent 70%)` }} />
        </div>

        {/* Content */}
        <div className="relative z-10 p-5 flex flex-col gap-3">
          {/* Avatar + info row */}
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-black border-2 border-white/20"
                style={{
                  background: "rgba(0,0,0,0.35)",
                  boxShadow: `0 0 20px ${rs.glow}, 0 0 40px ${rs.glow}55`,
                  backdropFilter: "blur(4px)",
                  animation: "bob 3s ease-in-out infinite",
                }}>
                {rs.icon}
              </div>
              {/* LIVE badge */}
              {profile.viewers > 0 && (
                <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-lg animate-pulse">
                  <span className="w-1.5 h-1.5 bg-white rounded-full inline-block" />
                  LIVE
                </div>
              )}
            </div>

            {/* Name + rank + subs */}
            <div className="flex-1 min-w-0">
              <div className="text-white font-black text-xl leading-tight truncate">
                МойКанал_Live
              </div>
              {/* Rank badge */}
              <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${rs.badge}`}>
                {rs.icon} {profile.rank}
              </div>
              {/* Subscribers */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 text-white/70 text-xs font-semibold">
                  <span>👥</span>
                  <span><AnimCount value={profile.subscribers} /></span>
                  <span className="text-white/40 font-normal">подписчиков</span>
                </div>
              </div>
            </div>
          </div>

          {/* Viewers live bar */}
          <div className="flex items-center gap-2 bg-black/25 rounded-xl px-3 py-2 backdrop-blur-sm">
            <span className="text-red-400 text-xs font-black animate-pulse">● LIVE</span>
            <span className="text-white font-bold text-sm">
              <AnimCount value={profile.viewers} /> зрителей
            </span>
            <div className="flex-1" />
            <span className="text-white/40 text-xs">{profile.gamesPlayed} игр</span>
          </div>
        </div>
      </div>

      {/* ── Rating progress ── */}
      <div className="rounded-2xl bg-white/4 border border-white/8 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/50 text-xs uppercase tracking-widest">Рейтинг</span>
          <span className={`text-xs font-bold ${rs.textCls}`}>
            {profile.rating.toLocaleString()} очков
          </span>
        </div>
        <div className="w-full h-3 bg-white/8 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700`}
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, var(--tw-gradient-stops))`,
              backgroundImage: `linear-gradient(90deg, #06b6d4, #a855f7)`,
              boxShadow: "0 0 10px rgba(168,85,247,0.6)",
            }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-white/30">
          <span>{profile.rank}</span>
          {nextRank ? (
            <span>до «{nextRank.name}»: {Math.max(0, nextRank.minRating - profile.rating).toLocaleString()} очков</span>
          ) : (
            <span className="text-yellow-400 font-bold">🏆 Максимальный ранг!</span>
          )}
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard icon="💰" label="Заработано" color="text-green-400"
          value={<AnimCount value={profile.totalEarnings} suffix=" ⭐" />}
          sub="всего за все игры"
        />
        <StatCard icon="🏆" label="Лучший сбор" color="text-yellow-400"
          value={formatMultiplier(profile.maxMultiplier)}
          sub="максимальный множитель"
        />
        <StatCard icon="👥" label="Подписчики" color="text-cyan-400"
          value={<AnimCount value={profile.subscribers} />}
          sub="растут с каждой победой"
        />
        <StatCard icon="🎮" label="Игр сыграно" color="text-purple-400"
          value={<AnimCount value={profile.gamesPlayed} />}
          sub="во всех режимах"
        />
      </div>

      {/* ── Rank ladder ── */}
      <div className="rounded-2xl bg-white/4 border border-white/8 p-4">
        <div className="text-xs text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
          <span>🏅</span> Лестница рангов
        </div>
        <div className="space-y-2.5">
          {RANKS.map((r, i) => {
            const isCurrent  = r.name === profile.rank;
            const isUnlocked = profile.rating >= r.minRating;
            const rs2 = rankStyle(r.name);
            return (
              <div key={r.name}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-all duration-300 ${
                  isCurrent ? "bg-white/8 border border-white/15" : ""
                }`}
              >
                <div className={`text-base ${isUnlocked ? "" : "opacity-30 grayscale"}`}>{rs2.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold truncate ${isCurrent ? rs2.textCls : isUnlocked ? "text-white/70" : "text-white/20"}`}>
                    {r.name}
                    {isCurrent && <span className="ml-2 text-[9px] font-black bg-white/15 px-1.5 py-0.5 rounded-full uppercase tracking-wide">ВЫ ЗДЕСЬ</span>}
                  </div>
                  <div className={`text-[10px] ${isUnlocked ? "text-white/30" : "text-white/15"}`}>
                    {r.minRating.toLocaleString()}+ очков
                  </div>
                </div>
                {isUnlocked && (
                  <div className="text-green-400 text-sm">✓</div>
                )}
                {!isUnlocked && (
                  <div className="text-white/15 text-sm">🔒</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
