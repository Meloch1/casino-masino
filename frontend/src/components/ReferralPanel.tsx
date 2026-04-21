import { useState, useEffect, useCallback } from "react";

const API = import.meta.env.BASE_URL + "api";

interface ReferralInfo {
  referralCode: string;
  referralLink: string;
  referredCount: number;
  totalEarned: number;
}

interface ReferralPanelProps {
  userId: string;
}

export function ReferralPanel({ userId }: ReferralPanelProps) {
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/referral/info/${userId}`);
      if (r.ok) setInfo(await r.json());
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const copy = async () => {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(info.referralLink);
    } catch {
      const el = document.createElement("textarea");
      el.value = info.referralLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = () => {
    if (!info) return;
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(info.referralLink)}&text=${encodeURIComponent("🚀 Присоединяйся к StreamRush — зарабатывай звёзды в стримерском краш-симуляторе!")}`
      );
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/4 border border-white/8 p-5 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-cyan-500/40 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!info) return null;

  return (
    <div className="rounded-2xl bg-white/4 border border-white/8 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600/20 to-purple-600/20 border-b border-white/8 px-4 py-3 flex items-center gap-2">
        <span className="text-lg">🤝</span>
        <div>
          <div className="text-white font-bold text-sm">Реферальная программа</div>
          <div className="text-white/40 text-[10px]">Приглашай друзей — получай 5% с их покупок</div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <div className="text-cyan-400 font-black text-2xl">{info.referredCount}</div>
            <div className="text-white/40 text-[10px] uppercase tracking-wider mt-0.5">Приглашено</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <div className="text-yellow-400 font-black text-2xl">{info.totalEarned.toLocaleString("ru")}</div>
            <div className="text-white/40 text-[10px] uppercase tracking-wider mt-0.5">Заработано ⭐</div>
          </div>
        </div>

        {/* How it works */}
        <div className="space-y-1.5">
          {[
            { icon: "🔗", text: "Поделись своей реферальной ссылкой" },
            { icon: "👤", text: "Друг регистрируется через неё" },
            { icon: "⭐", text: "Ты получаешь 5% от каждой его покупки звёзд" },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-white/50">
              <span className="text-base w-5 text-center shrink-0">{step.icon}</span>
              <span>{step.text}</span>
            </div>
          ))}
        </div>

        {/* Link box */}
        <div className="space-y-2">
          <div className="text-white/40 text-[10px] uppercase tracking-wider">Твоя ссылка</div>
          <div className="bg-black/30 rounded-xl px-3 py-2.5 flex items-center gap-2 border border-white/8">
            <span className="flex-1 text-cyan-300 text-xs font-mono truncate">
              {info.referralLink}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={copy}
              className={`py-2.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 ${
                copied
                  ? "bg-green-600/30 border border-green-500/40 text-green-400"
                  : "bg-white/8 border border-white/12 text-white/80 hover:bg-white/12"
              }`}
            >
              {copied ? "✓ Скопировано" : "📋 Копировать"}
            </button>
            <button
              onClick={share}
              className="py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-cyan-600/30 to-purple-600/30 border border-cyan-500/30 text-cyan-300 active:scale-95 transition-all duration-200 flex items-center justify-center gap-1.5"
            >
              📤 Поделиться
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
