import { useEffect, useState } from "react";

interface HypeModeOverlayProps {
  active: boolean;
}

type Spark = { id: number; x: number; y: number; emoji: string; size: number; dur: number };
const EMOJIS = ["🔥", "⚡", "💥", "✨", "🚀", "💫", "🎯", "🌟"];

export function HypeModeOverlay({ active }: HypeModeOverlayProps) {
  const [sparks, setSparks] = useState<Spark[]>([]);

  useEffect(() => {
    if (!active) { setSparks([]); return; }
    const interval = setInterval(() => {
      const spark: Spark = {
        id: Date.now() + Math.random(),
        x: 5 + Math.random() * 90,
        y: 10 + Math.random() * 80,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        size: 14 + Math.floor(Math.random() * 14),
        dur: 800 + Math.floor(Math.random() * 600),
      };
      setSparks((prev) => [...prev.slice(-12), spark]);
      setTimeout(() => setSparks((prev) => prev.filter((s) => s.id !== spark.id)), spark.dur + 100);
    }, 320);
    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  return (
    <>
      {/* Edge glow border */}
      <div className="fixed inset-0 pointer-events-none z-10">
        <div className="absolute inset-0 rounded-lg border-2 border-pink-500/50 animate-pulse" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 55%, rgba(236,72,153,0.12) 100%)",
          }}
        />
        {/* Corner flares */}
        <div className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-pink-500/30 to-transparent rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-pink-500/30 to-transparent rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-purple-500/25 to-transparent rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-purple-500/25 to-transparent rounded-br-lg" />
      </div>

      {/* Floating emoji sparks */}
      <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
        {sparks.map((s) => (
          <div
            key={s.id}
            className="absolute"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              fontSize: s.size,
              animation: `spark-in ${s.dur}ms ease-out forwards`,
            }}
          >
            {s.emoji}
          </div>
        ))}
      </div>

      {/* РЕЖИМ ХАЙПА badge */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div
          className="px-5 py-1.5 rounded-full text-pink-200 text-sm font-black tracking-widest uppercase animate-pulse shadow-[0_0_28px_rgba(236,72,153,0.7)]"
          style={{
            background: "linear-gradient(90deg, rgba(236,72,153,0.25), rgba(168,85,247,0.25))",
            border: "1px solid rgba(236,72,153,0.6)",
            backdropFilter: "blur(4px)",
          }}
        >
          🔥 РЕЖИМ ХАЙПА 🔥
        </div>
      </div>
    </>
  );
}
