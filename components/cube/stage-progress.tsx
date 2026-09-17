import { Check } from "lucide-react";

export const STAGES = [
  { stage: 1, label: "흰 십자가" },
  { stage: 2, label: "흰 면 완성" },
  { stage: 3, label: "2층 완성" },
  { stage: 4, label: "노란 십자가" },
  { stage: 5, label: "노란 십자가 옆면" },
  { stage: 6, label: "노란 꼭짓점 자리" },
  { stage: 7, label: "노란 꼭짓점 방향" },
] as const;

type Props = {
  readonly currentStage: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  readonly isAllSolved?: boolean;
};

export function StageProgress({ currentStage, isAllSolved = false }: Props) {
  return (
    <nav
      aria-label="큐브 맞추기 7단계 진행 현황"
      className="w-full max-w-md mx-auto py-1 select-none"
    >
      <ol className="flex items-center justify-between w-full">
        {STAGES.map((item, index) => {
          const s = item.stage;
          const isCompleted = isAllSolved || s < currentStage;
          const isCurrent = !isAllSolved && s === currentStage;
          const status = isCompleted ? "completed" : isCurrent ? "current" : "upcoming";

          return (
            <li key={s} className="flex items-center flex-1 last:flex-none">
              <div
                data-testid={`stage-step-${s}`}
                data-status={status}
                aria-current={isCurrent ? "step" : undefined}
                title={`${s}단계: ${item.label}`}
                className={`relative flex items-center justify-center shrink-0 rounded-full transition-colors text-xs font-bold ${
                  isCompleted
                    ? "h-6 w-6 sm:h-7 sm:w-7 bg-primary text-primary-foreground shadow-xs"
                    : isCurrent
                      ? "h-6 w-6 sm:h-7 sm:w-7 bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xs"
                      : "h-6 w-6 sm:h-7 sm:w-7 border border-border bg-muted/70 text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
                ) : (
                  <span>{s}</span>
                )}
                <span className="sr-only">
                  {s}단계 {item.label} ({isCompleted ? "완료" : isCurrent ? "진행 중" : "대기"})
                </span>
              </div>

              {index < STAGES.length - 1 ? (
                <div
                  aria-hidden="true"
                  className={`flex-1 h-0.5 mx-1 transition-colors ${
                    isAllSolved || s < currentStage ? "bg-primary" : "bg-border"
                  }`}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
