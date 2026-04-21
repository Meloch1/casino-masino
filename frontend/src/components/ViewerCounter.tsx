import { useEffect, useRef, useState } from "react";

interface ViewerCounterProps {
  viewers: number;
  hypeMode: boolean;
}

export function ViewerCounter({ viewers, hypeMode }: ViewerCounterProps) {
  const [displayViewers, setDisplayViewers] = useState(viewers);
  const [trend, setTrend] = useState<"up" | "down" | "neutral">("neutral");
  const prevRef = useRef(viewers);

  useEffect(() => {
    if (viewers !== prevRef.current) {
      setTrend(viewers > prevRef.current ? "up" : "down");
      prevRef.current = viewers;
    }

    let start = displayViewers;
    const end = viewers;
    if (start === end) return;

    const duration = 800;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayViewers(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
    const timer = setTimeout(() => setTrend("neutral"), 1500);
    return () => clearTimeout(timer);
  }, [viewers]);

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-500 ${
        hypeMode
          ? "border-pink-500 bg-pink-500/10 shadow-[0_0_20px_rgba(236,72,153,0.5)] animate-pulse"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="relative flex items-center">
        <div
          className={`w-2 h-2 rounded-full ${
            hypeMode ? "bg-pink-500" : "bg-red-500"
          } animate-ping absolute`}
        />
        <div
          className={`w-2 h-2 rounded-full ${
            hypeMode ? "bg-pink-400" : "bg-red-400"
          } relative`}
        />
      </div>
      <span className="text-xs text-white/50 uppercase tracking-widest">LIVE</span>
      <span
        className={`font-bold text-lg tabular-nums transition-colors duration-300 ${
          trend === "up"
            ? "text-green-400"
            : trend === "down"
            ? "text-red-400"
            : hypeMode
            ? "text-pink-300"
            : "text-white"
        }`}
      >
        {displayViewers.toLocaleString()}
      </span>
      <span className="text-white/40 text-sm">зрит.</span>
      {trend === "up" && (
        <span className="text-green-400 text-sm animate-bounce">▲</span>
      )}
      {trend === "down" && (
        <span className="text-red-400 text-sm">▼</span>
      )}
    </div>
  );
}
