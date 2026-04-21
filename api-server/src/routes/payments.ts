import { Router } from "express";
import { db, purchasesTable } from "@workspace/db";
import { referralsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export const STAR_PACKS: Record<string, { gameStars: number; tgStars: number; label: string }> = {
  pack_1:     { gameStars: 1,     tgStars: 1,     label: "1 Звезда" },
  pack_500:   { gameStars: 500,   tgStars: 500,   label: "500 Звёзд" },
  pack_1500:  { gameStars: 1500,  tgStars: 1500,  label: "1500 Звёзд" },
  pack_5000:  { gameStars: 5000,  tgStars: 5000,  label: "5000 Звёзд" },
  pack_15000: { gameStars: 15000, tgStars: 15000, label: "15000 Звёзд" },
};

async function tgPost(method: string, body: object) {
  const res = await fetch(`${TG_API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// POST /api/payments/invoice
router.post("/invoice", async (req, res) => {
  const { packId, telegramUserId, customAmount } = req.body as {
    packId: string;
    telegramUserId: string;
    customAmount?: number;
  };

  if (!telegramUserId) {
    res.status(400).json({ error: "Нет telegramUserId" });
    return;
  }

  let pack: { gameStars: number; tgStars: number; label: string };
  let resolvedPackId = packId;

  if (packId === "custom") {
    const amount = Math.floor(Number(customAmount));
    if (!amount || amount < 1 || amount > 100000) {
      res.status(400).json({ error: "Сумма должна быть от 1 до 100 000" });
      return;
    }
    pack = { gameStars: amount, tgStars: amount, label: `${amount} Звёзд` };
    resolvedPackId = `custom_${amount}`;
  } else {
    const found = STAR_PACKS[packId];
    if (!found) {
      res.status(400).json({ error: "Неверный пак" });
      return;
    }
    pack = found;
  }

  const payload = `${telegramUserId}:${resolvedPackId}:${Date.now()}`;

  const result = await tgPost("createInvoiceLink", {
    title: pack.label,
    description: `Пополнение баланса StreamRush на ${pack.gameStars} ⭐`,
    payload,
    currency: "XTR",
    prices: [{ label: pack.label, amount: pack.tgStars }],
  });

  if (!result.ok) {
    res.status(500).json({ error: result.description || "Ошибка Telegram API" });
    return;
  }

  await db.insert(purchasesTable).values({
    telegramUserId: String(telegramUserId),
    packId: resolvedPackId,
    gameStars: pack.gameStars,
    tgStars: pack.tgStars,
    telegramPayload: payload,
    status: "pending",
    claimed: 0,
  });

  res.json({ invoiceUrl: result.result });
});

// POST /api/payments/webhook — Telegram webhook
router.post("/webhook", async (req, res) => {
  const update = req.body as any;

  if (update.pre_checkout_query) {
    await tgPost("answerPreCheckoutQuery", {
      pre_checkout_query_id: update.pre_checkout_query.id,
      ok: true,
    });
    res.json({ ok: true });
    return;
  }

  if (update.message?.successful_payment) {
    const payload: string = update.message.successful_payment.invoice_payload;
    const buyerId = String(update.message.from?.id ?? "");

    const rows = await db
      .select()
      .from(purchasesTable)
      .where(
        and(
          eq(purchasesTable.telegramPayload, payload),
          eq(purchasesTable.status, "pending"),
        ),
      );

    await db
      .update(purchasesTable)
      .set({ status: "completed" })
      .where(
        and(
          eq(purchasesTable.telegramPayload, payload),
          eq(purchasesTable.status, "pending"),
        ),
      );

    if (rows.length > 0 && buyerId) {
      const purchase = rows[0];
      const bonusStars = Math.floor(purchase.gameStars * 0.05);
      if (bonusStars > 0) {
        const refRows = await db
          .select()
          .from(referralsTable)
          .where(eq(referralsTable.referredId, buyerId));

        if (refRows.length > 0) {
          const referrer = refRows[0];
          await db.insert(purchasesTable).values({
            telegramUserId: referrer.referrerId,
            packId: "referral_bonus",
            gameStars: bonusStars,
            tgStars: 0,
            telegramPayload: `referral:${referrer.referrerId}:from:${buyerId}:${Date.now()}`,
            status: "completed",
            claimed: 0,
          });
          await db
            .update(referralsTable)
            .set({ totalBonusEarned: sql`${referralsTable.totalBonusEarned} + ${bonusStars}` })
            .where(eq(referralsTable.id, referrer.id));
        }
      }
    }

    res.json({ ok: true });
    return;
  }

  const text: string = update.message?.text ?? "";
  const chatId: number = update.message?.chat?.id;

  if (chatId && (text === "/start" || text === "/play" || text.startsWith("/start ") || text.startsWith("/play "))) {
    const domain = process.env.APP_DOMAIN;

    // Extract ref code from start param e.g. "/start ref_123456789"
    const parts = text.trim().split(" ");
    const startParam = parts[1] ?? "";
    const refCode = startParam.startsWith("ref_") ? startParam.slice(4) : "";

    // Pass ref code in URL so the Mini App can read it via URLSearchParams
    const appUrl = refCode
      ? `https://${domain}/?ref=${refCode}`
      : `https://${domain}/`;

    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "🚀 *StreamRush* — стримерский краш\\-симулятор\\!\n\nВыходи в эфир, расти множитель и забирай деньги до краша\\.",
      parse_mode: "MarkdownV2",
      reply_markup: {
        inline_keyboard: [[
          { text: "🚀 Запустить игру", web_app: { url: appUrl } },
        ]],
      },
    });
  }

  res.json({ ok: true });
});

// GET /api/payments/credits/:userId — get unclaimed completed purchases
router.get("/credits/:userId", async (req, res) => {
  const { userId } = req.params;

  const rows = await db
    .select()
    .from(purchasesTable)
    .where(
      and(
        eq(purchasesTable.telegramUserId, userId),
        eq(purchasesTable.status, "completed"),
        eq(purchasesTable.claimed, 0),
      ),
    );

  const total = rows.reduce((sum, r) => sum + r.gameStars, 0);
  const ids = rows.map((r) => r.id);

  if (ids.length > 0) {
    await db
      .update(purchasesTable)
      .set({ claimed: 1 })
      .where(eq(purchasesTable.telegramUserId, userId));
  }

  res.json({ credits: total, count: ids.length });
});

// POST /api/payments/setup-webhook — register webhook with Telegram
router.post("/setup-webhook", async (req, res) => {
  const domain = process.env.APP_DOMAIN;
  if (!domain) {
    res.status(500).json({ error: "APP_DOMAIN not set" });
    return;
  }

  const webhookUrl = `https://${domain}/api/payments/webhook`;
  const result = await tgPost("setWebhook", { url: webhookUrl });
  res.json(result);
});

export default router;
