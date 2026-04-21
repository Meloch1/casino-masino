import { DailyTask } from "@/lib/gameLogic";

interface DailyTasksProps {
  tasks: DailyTask[];
  freeRewardReady: boolean;
  onClaimFreeReward: () => void;
}

export function DailyTasks({ tasks, freeRewardReady, onClaimFreeReward }: DailyTasksProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white/60 text-xs uppercase tracking-widest font-semibold">
          Ежедневные задания
        </h3>
        {freeRewardReady && (
          <button
            onClick={onClaimFreeReward}
            className="px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 text-xs font-semibold hover:bg-yellow-500/30 transition-all animate-pulse"
          >
            Бесплатная награда! +10⭐
          </button>
        )}
      </div>

      <div className="space-y-2">
        {tasks.map((task) => {
          const pct = Math.min((task.current / task.target) * 100, 100);
          return (
            <div
              key={task.id}
              className={`p-3 rounded-xl border transition-all ${
                task.completed
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-white/5 border-white/10"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-sm font-medium ${
                    task.completed ? "text-green-300 line-through" : "text-white/80"
                  }`}
                >
                  {task.description}
                </span>
                <span
                  className={`text-xs font-bold ${
                    task.completed ? "text-green-400" : "text-yellow-400"
                  }`}
                >
                  +{task.reward}⭐
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      task.completed
                        ? "bg-green-400"
                        : "bg-gradient-to-r from-cyan-500 to-purple-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-white/30 text-xs shrink-0">
                  {Math.min(task.current, task.target)}/{task.target}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
