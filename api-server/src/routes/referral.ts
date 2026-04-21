import { Router } from "express";
import { db, purchasesTable } from "@workspace/db";
import { referralsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function tgGet(method: string) {
  const res = await fetch(`${TG_API}/${method}`);
  return res.json();
}

async function getBotUsername(): Promise<string> {
  try {
    const r = await tgGet("getMe");
    return r.result?.username ?? "StreamRushBot";
  } catch {
    return "StreamRushBot";
  }
}

// GET /api/referral/info/:userId
router.get("/info/:userId", async (req, res) => {
  const { userId } = req.params;

  const botUsername = await getBotUsername();

  const refs = await db
    .select()
    .from(referralsTable)
    .where(eq(referralsTable.referrerId, userId));

  const totalEarned = refs.reduce((s, r) => s + r.totalBonusEarned, 0);
  const referredCount = refs.length;

  res.json({
    referralCode: `ref_${userId}`,
    referralLink: `https://t.me/${botUsername}?start=ref_${userId}`,
    referredCount,
    totalEarned,
  });
});

// POST /api/referral/register — called when a new user opens via ref link
router.post("/register", async (req, res) => {
  const { referrerId, newUserId } = req.body as { referrerId: string; newUserId: string };

  if (!referrerId || !newUserId) {
    res.status(400).json({ error: "Не хватает параметров" });
    return;
  }
  if (referrerId === newUserId) {
    res.status(400).json({ error: "Нельзя пригласить себя" });
    return;
  }

  const existing = await db
    .select()
    .from(referralsTable)
    .where(eq(referralsTable.referredId, newUserId));

  if (existing.length > 0) {
    res.json({ ok: true, alreadyRegistered: true });
    return;
  }

  await db.insert(referralsTable).values({
    referrerId,
    referredId: newUserId,
    totalBonusEarned: 0,
  });

  res.json({ ok: true, alreadyRegistered: false });
});

export default router;
