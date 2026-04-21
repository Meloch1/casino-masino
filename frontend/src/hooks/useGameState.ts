import { useState, useRef, useCallback, useEffect } from "react";
import {
  GamePhase,
  ChatMessage,
  PlayerProfile,
  DailyTask,
  generateCrashMultiplier,
  growMultiplier,
  getViewerChange,
  getRatingChange,
  generateLiveChatMessage,
  isHypeMode,
  isDangerZone,
  getRank,
  DEFAULT_PROFILE,
  DEFAULT_TASKS,
} from "@/lib/gameLogic";

export interface GameState {
  phase: GamePhase;
  profile: PlayerProfile;
  currentBet: number;
  currentMultiplier: number;
  crashMultiplier: number;
  collectedAmount: number;
  messages: ChatMessage[];
  tasks: DailyTask[];
  hypeMode: boolean;
  dangerZone: boolean;
  shaking: boolean;
  freeRewardReady: boolean;
  quickCollectStreak: number;
}

// If a player collects below this multiplier, it counts as an "instant collect"
const INSTANT_COLLECT_THRESHOLD = 1.35;
// After this many consecutive instant collects, the next one crashes
const INSTANT_COLLECT_LIMIT = 2;

const CHAT_INTERVAL_NORMAL = 1400;
const CHAT_INTERVAL_FAST = 650;
const TICK_MS = 50;

export function useGameState() {
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickRef = useRef<number>(0);
  const crashMultRef = useRef<number>(1);
  const currentMultRef = useRef<number>(1);

  const [state, setState] = useState<GameState>({
    phase: "idle",
    profile: DEFAULT_PROFILE,
    currentBet: 50,
    currentMultiplier: 1,
    crashMultiplier: 1,
    collectedAmount: 0,
    messages: [],
    tasks: DEFAULT_TASKS,
    hypeMode: false,
    dangerZone: false,
    shaking: false,
    freeRewardReady: true,
    quickCollectStreak: 0,
  });

  const stopAll = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (chatRef.current) { clearInterval(chatRef.current); chatRef.current = null; }
  }, []);

  const addMessage = useCallback((mult: number, danger: boolean) => {
    const msg = generateLiveChatMessage(mult, danger);
    setState((s) => ({
      ...s,
      messages: [...s.messages.slice(-45), msg],
    }));
  }, []);

  const startChatTimer = useCallback((fast: boolean) => {
    if (chatRef.current) clearInterval(chatRef.current);
    const interval = fast ? CHAT_INTERVAL_FAST : CHAT_INTERVAL_NORMAL;
    chatRef.current = setInterval(() => {
      const mult = currentMultRef.current;
      const danger = isDangerZone(mult, crashMultRef.current);
      addMessage(mult, danger);
      if (fast !== (isHypeMode(mult) || danger)) {
        startChatTimer(isHypeMode(mult) || danger);
      }
    }, interval);
  }, [addMessage]);

  const crash = useCallback((bet: number, crashAt: number) => {
    stopAll();
    setState((s) => {
      const newBalance = s.profile.balance - bet;
      const viewerChange = getViewerChange(crashAt, false);
      const ratingChange = getRatingChange(crashAt, false);
      const newViewers = Math.max(0, s.profile.viewers + viewerChange);
      const newRating = Math.max(0, s.profile.rating + ratingChange);
      const newGames = s.profile.gamesPlayed + 1;
      let tasks = s.tasks.map((t) =>
        t.id === "play10" && !t.completed
          ? { ...t, current: t.current + 1, completed: t.current + 1 >= t.target }
          : t
      );
      return {
        ...s,
        phase: "crashed",
        profile: {
          ...s.profile,
          balance: Math.max(0, newBalance),
          viewers: newViewers,
          rating: newRating,
          gamesPlayed: newGames,
          rank: getRank(newRating),
        },
        currentMultiplier: crashAt,
        tasks,
        hypeMode: false,
        dangerZone: false,
        shaking: true,
      };
    });
    setTimeout(() => setState((s) => ({ ...s, shaking: false })), 700);
  }, [stopAll]);

  const goLive = useCallback(() => {
    setState((s) => {
      if (s.phase !== "idle") return s;
      if (s.currentBet > s.profile.balance || s.currentBet <= 0) return s;

      const crashMult = generateCrashMultiplier();
      crashMultRef.current = crashMult;
      currentMultRef.current = 1.0;
      lastTickRef.current = performance.now();

      return {
        ...s,
        phase: "live",
        currentMultiplier: 1.0,
        crashMultiplier: crashMult,
        collectedAmount: 0,
        hypeMode: false,
        dangerZone: false,
        messages: [],
      };
    });

    setTimeout(() => {
      const bet = state.currentBet;
      const crashMult = crashMultRef.current;

      tickRef.current = setInterval(() => {
        const now = performance.now();
        const deltaMs = now - lastTickRef.current;
        lastTickRef.current = now;

        currentMultRef.current = growMultiplier(currentMultRef.current, deltaMs);
        const newMult = currentMultRef.current;

        if (newMult >= crashMult) {
          currentMultRef.current = crashMult;
          crash(bet, crashMult);
          return;
        }

        const hype = isHypeMode(newMult);
        const danger = isDangerZone(newMult, crashMult);

        setState((s) => {
          if (s.phase !== "live") return s;
          return {
            ...s,
            currentMultiplier: newMult,
            hypeMode: hype,
            dangerZone: danger,
          };
        });
      }, TICK_MS);

      startChatTimer(false);
    }, 50);
  }, [state.currentBet, crash, startChatTimer]);

  const collect = useCallback(() => {
    let didAbuseCrash = false;

    setState((s) => {
      if (s.phase !== "live") return s;
      const mult = s.currentMultiplier;
      const isInstant = mult < INSTANT_COLLECT_THRESHOLD;

      // Anti-abuse: if they've instantly collected LIMIT times in a row,
      // the next instant collect triggers an immediate crash
      if (isInstant && s.quickCollectStreak >= INSTANT_COLLECT_LIMIT) {
        didAbuseCrash = true;
        stopAll();
        const newBalance = Math.max(0, s.profile.balance - s.currentBet);
        const viewerChange = getViewerChange(mult, false);
        const newViewers = Math.max(0, s.profile.viewers + viewerChange);
        const newRating = Math.max(0, s.profile.rating - 5);
        const newGames = s.profile.gamesPlayed + 1;
        let tasks = s.tasks.map((t) =>
          t.id === "play10" && !t.completed
            ? { ...t, current: t.current + 1, completed: t.current + 1 >= t.target }
            : t
        );
        return {
          ...s,
          phase: "crashed",
          profile: {
            ...s.profile,
            balance: newBalance,
            viewers: newViewers,
            rating: newRating,
            gamesPlayed: newGames,
            rank: getRank(newRating),
          },
          currentMultiplier: mult,
          tasks,
          hypeMode: false,
          dangerZone: false,
          shaking: true,
          quickCollectStreak: 0,
        };
      }

      // Normal collect
      const payout = Math.floor(s.currentBet * mult);
      const profit = payout - s.currentBet;
      const viewerChange = getViewerChange(mult, true);
      const ratingChange = getRatingChange(mult, true);
      const newViewers = Math.max(0, s.profile.viewers + viewerChange);
      const newRating = Math.max(0, s.profile.rating + ratingChange);
      const newGames = s.profile.gamesPlayed + 1;
      const newMaxMult = Math.max(s.profile.maxMultiplier, mult);
      const newStreak = isInstant ? s.quickCollectStreak + 1 : 0;
      const subsGain = Math.floor(mult * 2 + Math.random() * 3);

      let tasks = s.tasks.map((t) => {
        if (t.completed) return t;
        if (t.id === "play10") return { ...t, current: t.current + 1, completed: t.current + 1 >= t.target };
        if (t.id === "reach_x4" && mult >= 4) return { ...t, current: 1, completed: true };
        if (t.id === "earn500" && payout >= 500) return { ...t, current: payout, completed: true };
        if (t.id === "viewers50") return { ...t, current: Math.max(t.current, newViewers), completed: newViewers >= 50 };
        return t;
      });

      return {
        ...s,
        phase: "collected",
        profile: {
          ...s.profile,
          balance: s.profile.balance - s.currentBet + payout,
          viewers: newViewers,
          subscribers: s.profile.subscribers + subsGain,
          rating: newRating,
          gamesPlayed: newGames,
          maxMultiplier: newMaxMult,
          totalEarnings: s.profile.totalEarnings + profit,
          rank: getRank(newRating),
        },
        collectedAmount: payout,
        tasks,
        hypeMode: false,
        dangerZone: false,
        quickCollectStreak: newStreak,
      };
    });
    stopAll();
    if (didAbuseCrash) {
      setTimeout(() => setState((s) => ({ ...s, shaking: false })), 700);
    }
  }, [stopAll]);

  const reset = useCallback(() => {
    setState((s) => ({
      ...s,
      phase: "idle",
      currentMultiplier: 1,
      crashMultiplier: 1,
      collectedAmount: 0,
      hypeMode: false,
      dangerZone: false,
    }));
  }, []);

  const setBet = useCallback((amount: number) => {
    setState((s) => {
      if (s.phase !== "idle") return s;
      return { ...s, currentBet: Math.max(1, Math.min(amount, s.profile.balance)) };
    });
  }, []);

  const claimFreeReward = useCallback(() => {
    setState((s) => {
      if (!s.freeRewardReady) return s;
      return {
        ...s,
        profile: { ...s.profile, balance: s.profile.balance + 10 },
        freeRewardReady: false,
      };
    });
    setTimeout(() => setState((s) => ({ ...s, freeRewardReady: true })), 3 * 60 * 60 * 1000);
  }, []);

  const addCredits = useCallback((amount: number) => {
    setState((s) => ({
      ...s,
      profile: { ...s.profile, balance: s.profile.balance + amount },
    }));
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  return { state, goLive, collect, reset, setBet, claimFreeReward, addCredits };
}
