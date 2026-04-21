import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const referralsTable = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: text("referrer_id").notNull(),
  referredId: text("referred_id").notNull(),
  totalBonusEarned: integer("total_bonus_earned").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
