import { useState, useEffect } from "react";

const PACKS = [
  { id: "pack_1",     gameStars: 1,     tgStars: 1,     bonus: "Мин",    color: "from-slate-500/20 to-slate-600/10",   border: "border-slate-500/30",  glow: "shadow-slate-500/20"  },
  { id: "pack_500",   gameStars: 500,   tgStars: 500,   bonus: "",       color: "from-sky-500/20 to-sky-600/10",       border: "border-sky-500/30",    glow: "shadow-sky-500/20"    },
  { id: "pack_1500",  gameStars: 1500,  tgStars: 1500,  bonus: "",       color: "from-violet-500/20 to-violet-600/10", border: "border-violet-500/30", glow: "shadow-violet-500/20" },
  { id: "pack_5000",  gameStars: 5000,  tgStars: 5000,  bonus: "",       color: "from-amber-500/20 to-amber-600/10",   border: "border-amber-500/30",  glow: "shadow-amber-500/20"  },
  { id: "pack_15000", gameStars: 15000, tgStars: 15000, bonus: "🔥 Макс", color: "from-rose-500/20 to-rose-600/10",    border: "border-rose-500/30",   glow: "shadow-rose-500/20"   },
];

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: { user?: { id?: number } };
        openInvoice?: (url: string, cb: (status: string) => void) => void;
      };
    };
  }
}

interface StarShopProps {
  onCreditsReceived: (amount: number) => void;
}

export default function StarShop({ onCreditsReceived }: StarShopProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [customInput, setCustomInput] = useState("");

  const telegramUserId = String(
    window.Telegram?.WebApp?.initDataUnsafe?.user?.id ?? "test_user"
  );

  useEffect(() => {
    checkCredits();
  }, []);

  async function checkCredits() {
    try {
      const res = await fetch(`/api/payments/credits/${telegramUserId}`);
      const data = await res.json();
      if (data.credits > 0) {
        onCreditsReceived(data.credits);
        setMessage({ text: `+${data.credits} ⭐ зачислено на баланс!`, ok: true });
        setTimeout(() => setMessage(null), 4000);
      }
    } catch {
    }
  }

  async function buyCustom() {
    const amount = parseInt(customInput, 10);
    if (!amount || amount < 1) {
      setMessage({ text: "Введи сумму от 1 звезды", ok: false });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (amount > 100000) {
      setMessage({ text: "Максимум 100 000 звёзд за раз", ok: false });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    await buyPack("custom", amount);
  }

  async function buyPack(packId: string, customAmount?: number) {
    setLoading(packId);
    setMessage(null);
    try {
      const res = await fetch("/api/payments/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId, telegramUserId, customAmount }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setMessage({ text: data.error || "Ошибка создания счёта", ok: false });
        setLoading(null);
        return;
      }

      const tgWebApp = window.Telegram?.WebApp;
      if (tgWebApp && typeof tgWebApp.openInvoice === "function") {
        tgWebApp.openInvoice(data.invoiceUrl, async (status: string) => {
          setLoading(null);
          if (status === "paid") {
            setTimeout(async () => {
              await checkCredits();
            }, 1500);
          } else if (status === "cancelled") {
            setMessage({ text: "Платёж отменён", ok: false });
            setTimeout(() => setMessage(null), 3000);
          } else if (status === "failed") {
            setMessage({ text: "Ошибка оплаты, попробуй ещё раз", ok: false });
            setTimeout(() => setMessage(null), 3000);
          }
        });
      } else {
        window.open(data.invoiceUrl, "_blank");
        setLoading(null);
      }
    } catch {
      setMessage({ text: "Сетевая ошибка", ok: false });
      setLoading(null);
    }
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="text-center mb-2">
        <div className="text-2xl font-black text-white tracking-wide">Магазин ⭐</div>
        <div className="text-sm text-white/50 mt-1">Купи звёзды за звёзды Telegram</div>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium text-center animate-in slide-in-from-top-2 duration-300 ${
          message.ok
            ? "bg-green-500/15 border border-green-500/40 text-green-300"
            : "bg-red-500/15 border border-red-500/40 text-red-300"
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {PACKS.map((pack, i) => (
          <button
            key={pack.id}
            onClick={() => buyPack(pack.id)}
            disabled={loading !== null}
            className={`relative rounded-2xl border p-4 text-left bg-gradient-to-br ${pack.color} ${pack.border} shadow-lg ${pack.glow} active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${i === PACKS.length - 1 && PACKS.length % 2 !== 0 ? "col-span-2" : ""}`}
          >
            {pack.bonus && (
              <div className="absolute -top-2 -right-1 bg-violet-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {pack.bonus}
              </div>
            )}

            <div className="text-2xl font-black text-white leading-none mb-1">
              {loading === pack.id ? (
                <span className="text-base animate-pulse">Открываю...</span>
              ) : (
                <>{pack.gameStars.toLocaleString("ru")} ⭐</>
              )}
            </div>

            <div className="flex items-center gap-1 mt-2">
              <span className="text-yellow-400 text-sm font-bold">{pack.tgStars}</span>
              <span className="text-white/60 text-xs">Telegram Stars</span>
            </div>
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
        <div className="text-sm font-semibold text-white/70 mb-3">Своя сумма</div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-400 text-base pointer-events-none">⭐</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={100000}
              placeholder="Сколько звёзд?"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buyCustom()}
              className="w-full bg-white/8 border border-white/15 rounded-xl pl-9 pr-3 py-3 text-white text-sm font-medium placeholder-white/25 outline-none focus:border-violet-400/60 transition-colors"
            />
          </div>
          <button
            onClick={buyCustom}
            disabled={loading !== null || !customInput}
            className="px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-sm font-bold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading === "custom" ? (
              <span className="animate-pulse">…</span>
            ) : (
              "Купить"
            )}
          </button>
        </div>
        <div className="text-white/25 text-[11px] mt-2">от 1 до 100 000 звёзд · курс 1:1</div>
      </div>

      <div className="text-center text-white/30 text-xs mt-2">
        Оплата через встроенную систему Telegram
      </div>
    </div>
  );
}
