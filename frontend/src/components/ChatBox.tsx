import { useEffect, useRef } from "react";
import { ChatMessage } from "@/lib/gameLogic";

interface ChatBoxProps {
  messages: ChatMessage[];
  hypeMode: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  hype: "text-yellow-400",
  realist: "text-blue-300",
  troll: "text-red-400",
  lucky: "text-green-400",
  system: "text-purple-400",
};

const USERNAME_COLORS = [
  "text-cyan-400", "text-pink-400", "text-orange-400",
  "text-emerald-400", "text-violet-400", "text-amber-400",
];

function hashUsername(name: string): number {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % USERNAME_COLORS.length;
}

export function ChatBox({ messages, hypeMode }: ChatBoxProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-xs text-white/60 font-medium uppercase tracking-widest">
          Чат стрима
        </span>
      </div>
      <div
        className={`flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin ${
          hypeMode ? "bg-pink-950/10" : ""
        }`}
        style={{ scrollbarWidth: "none" }}
      >
        {messages.length === 0 && (
          <p className="text-white/20 text-xs text-center pt-8">
            Выйди в эфир — зрители подтянутся!
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="flex gap-1.5 items-start text-sm leading-tight animate-in slide-in-from-bottom-2 fade-in duration-300"
          >
            <span
              className={`font-semibold shrink-0 ${
                USERNAME_COLORS[hashUsername(msg.username)]
              }`}
            >
              {msg.username}:
            </span>
            <span className={`${TYPE_COLORS[msg.type]} break-words`}>
              {msg.text}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
