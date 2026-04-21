import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const purchasesTable = pgTable("purchases", {
  id: serial("id").primaryKey(),
  telegramUserId: text("telegram_user_id").notNull(),
  packId: text("pack_id").notNull(),
  gameStars: integer("game_stars").notNull(),
  tgStars: integer("tg_stars").notNull(),
  telegramPayload: text("telegram_payload").notNull(),
  status: text("status").notNull().default("pending"),
  claimed: integer("claimed").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPurchaseSchema = createInsertSchema(purchasesTable).omit({ id: true, createdAt: true });
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Purchase = typeof purchasesTable.$inferSelect;
