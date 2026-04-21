export type GamePhase =
  | "idle"
  | "live"
  | "crashed"
  | "collected";

export type ChatMessageType = "hype" | "realist" | "troll" | "lucky" | "system";

export interface ChatMessage {
  id: number;
  type: ChatMessageType;
  text: string;
  username: string;
}

export interface PlayerProfile {
  balance: number;
  viewers: number;
  subscribers: number;
  rating: number;
  maxMultiplier: number;
  totalEarnings: number;
  gamesPlayed: number;
  rank: string;
}

export interface DailyTask {
  id: string;
  description: string;
  target: number;
  current: number;
  reward: number;
  completed: boolean;
}

export const RANKS = [
  { name: "Безызвестный", minRating: 0 },
  { name: "Малый стример", minRating: 100 },
  { name: "Восходящая звезда", minRating: 500 },
  { name: "Вирусный", minRating: 1500 },
  { name: "Топ-стример", minRating: 5000 },
];

export function getRank(rating: number): string {
  let rank = RANKS[0].name;
  for (const r of RANKS) {
    if (rating >= r.minRating) rank = r.name;
  }
  return rank;
}

/**
 * Генерация краш-множителя по вероятностям:
 *  - 70%  → краш до x2
 *  - 25%  выживших → краш до x4
 *  - 15%  выживших → краш до x8
 *  - 7%   выживших → краш до x16
 *  - редко → выше x16
 */
export function generateCrashMultiplier(): number {
  const r = Math.random();
  if (r < 0.70) {
    return 1.0 + Math.random() * 0.95; // 1.00 – 1.95
  }
  const r2 = Math.random();
  if (r2 < 0.75) {
    return 2.0 + Math.random() * 1.98; // 2.00 – 3.98
  }
  const r3 = Math.random();
  if (r3 < 0.85) {
    return 4.0 + Math.random() * 3.98; // 4.00 – 7.98
  }
  const r4 = Math.random();
  if (r4 < 0.93) {
    return 8.0 + Math.random() * 7.98; // 8.00 – 15.98
  }
  return 16.0 + Math.random() * 14.0; // джекпот
}

/** Рост множителя (~каждые 50мс, deltaMs в мс) */
export function growMultiplier(current: number, deltaMs: number): number {
  const speed = 0.0005 * Math.max(current, 1) * (1 + current * 0.04);
  return current + speed * deltaMs;
}

export function getViewerChange(mult: number, won: boolean): number {
  if (!won) return -(Math.floor(Math.random() * 5) + 1);
  if (mult >= 16) return 300;
  if (mult >= 8) return 80;
  if (mult >= 4) return 20;
  if (mult >= 2) return 5;
  return Math.floor(Math.random() * 3) + 1;
}

export function getRatingChange(mult: number, won: boolean): number {
  if (!won) return -Math.max(3, Math.floor(mult * 2));
  return Math.floor(mult * 10);
}

const HYPE_MESSAGES = [
  "ДА ДА ДА 🔥", "ЭТО ОГРОМНО", "НЕ ОСТАНАВЛИВАЙСЯ", "ДАВАЙ ЖМИ",
  "ТЫ В ОГНЕ", "НЕПОБЕДИМ", "КЛИПАЙ ЭТО", "Ж СТРИМЕР",
];
const REALIST_MESSAGES = [
  "может заберёшь уже?", "уже хорошая прибыль", "выводи пока не поздно",
  "не жадничай...", "забери брат", "хороший результат был",
];
const TROLL_MESSAGES = [
  "сольёт 💀", "рип баланс", "просто прими поражение",
  "F в чате", "надежда умирает последней...", "это плохо кончится",
  "бро приготовься", "скилл-иссью надвигается",
];
const LUCKY_MESSAGES = [
  "я только что поднял!", "буквально выиграл x16 только что", "та же ставка и я победил 👀",
  "доверяй стриму", "я уже в +3x сегодня",
];
const DANGER_MESSAGES = [
  "бро БЕРИ", "СЕЙЧАС РУХНЕТ", "выводи СЕЙЧАС",
  "не надо...", "забирай деньги!!!", "ПОЖАЛУЙСТА ВЫВОДИ",
];
const USERNAMES = [
  "ПроГеймер99", "ВьюерФан", "КриптоКороль", "НочнойВолк",
  "ТурбоЧат", "ЛакиДэн", "СкептикСтив", "ХайпТренер", "РилТолк",
  "БигБрейн", "ЧатГремлин", "ВайбзОнли", "ЛуркерПрайм", "СпидранКинг",
  "АльфаВотчер", "ГлитчХантер", "НеонРайдер", "ФантомЧат", "ЗироТуХиро",
  "xXГеймерXx",
];

export function generateLiveChatMessage(
  mult: number,
  isDanger: boolean
): ChatMessage {
  let type: ChatMessageType;
  let pool: string[];

  if (isDanger) {
    const r = Math.random();
    if (r < 0.5) { type = "troll"; pool = DANGER_MESSAGES; }
    else if (r < 0.8) { type = "troll"; pool = TROLL_MESSAGES; }
    else { type = "realist"; pool = REALIST_MESSAGES; }
  } else if (mult >= 4) {
    const r = Math.random();
    if (r < 0.5) { type = "hype"; pool = HYPE_MESSAGES; }
    else if (r < 0.7) { type = "lucky"; pool = LUCKY_MESSAGES; }
    else { type = "realist"; pool = REALIST_MESSAGES; }
  } else if (mult >= 2) {
    const r = Math.random();
    if (r < 0.4) { type = "realist"; pool = REALIST_MESSAGES; }
    else if (r < 0.7) { type = "hype"; pool = HYPE_MESSAGES; }
    else { type = "troll"; pool = TROLL_MESSAGES; }
  } else {
    const r = Math.random();
    if (r < 0.5) { type = "troll"; pool = TROLL_MESSAGES; }
    else { type = "realist"; pool = REALIST_MESSAGES; }
  }

  return {
    id: Date.now() + Math.random(),
    type,
    text: pool[Math.floor(Math.random() * pool.length)],
    username: USERNAMES[Math.floor(Math.random() * USERNAMES.length)],
  };
}

export function isHypeMode(mult: number): boolean {
  return mult >= 8;
}

export function isDangerZone(mult: number, crashMult: number): boolean {
  return crashMult - mult < 1.5 && mult > 1.2;
}

export const DEFAULT_PROFILE: PlayerProfile = {
  balance: 0,
  viewers: 0,
  subscribers: 0,
  rating: 0,
  maxMultiplier: 1,
  totalEarnings: 0,
  gamesPlayed: 0,
  rank: "Безызвестный",
};

export const DEFAULT_TASKS: DailyTask[] = [
  { id: "play10", description: "Сыграть 10 раундов", target: 10, current: 0, reward: 10, completed: false },
  { id: "reach_x4", description: "Забрать при x4 или выше", target: 1, current: 0, reward: 10, completed: false },
  { id: "earn500", description: "Забрать 500+ звёзд за раунд", target: 500, current: 0, reward: 10, completed: false },
  { id: "viewers50", description: "Набрать 50 зрителей", target: 50, current: 0, reward: 10, completed: false },
];

export function formatBalance(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  return amount.toFixed(0);
}

export function formatMultiplier(m: number): string {
  if (m >= 10) return m.toFixed(1) + "x";
  return m.toFixed(2) + "x";
}
