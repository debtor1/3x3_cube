"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  type CaseQuiz,
  type FormulaCard,
  type LessonStage,
  STAGE_FORMULAS,
  STAGE_PRINCIPLES,
} from "@/lib/cube/lesson";

/** 공식을 보여 주기 전에 지금이 어떤 경우인지 아이가 먼저 골라 보는 카드. */
export function CaseQuizCard({
  quiz,
  onDone,
}: {
  readonly quiz: CaseQuiz;
  readonly onDone: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const answerLabel = quiz.options.find((o) => o.value === quiz.answer)?.label ?? "";
  const isCorrect = picked === quiz.answer;

  return (
    <div
      data-testid="case-quiz"
      className="flex w-full max-w-md flex-col gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 p-3 text-left"
    >
      <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
        🤔 먼저 맞혀 볼까요?
      </p>
      <p className="text-sm font-semibold text-foreground">{quiz.question}</p>
      <p className="text-xs text-muted-foreground">👀 {quiz.hint}</p>

      <div className="flex flex-wrap gap-2">
        {quiz.options.map((option) => {
          const chosen = picked === option.value;
          const reveal = picked !== null && option.value === quiz.answer;
          return (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={reveal ? "default" : chosen ? "destructive" : "outline"}
              aria-pressed={chosen}
              onClick={() => {
                if (picked === null) setPicked(option.value);
              }}
            >
              {reveal ? "⭕ " : chosen ? "❌ " : ""}
              {option.label}
            </Button>
          );
        })}
      </div>

      {picked !== null ? (
        <div className="flex flex-col gap-2" data-testid="case-quiz-feedback">
          <p className="text-sm font-medium text-foreground">
            {isCorrect ? "👏 맞았어요!" : "괜찮아요! 다음엔 꼭 맞힐 수 있어요."} 정답:{" "}
            <strong>{answerLabel}</strong>
          </p>
          <Button type="button" size="sm" className="self-start" onClick={onDone}>
            공식 보러 가기
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** 단계의 원리를 한 줄로 보여 준다. */
export function PrincipleNote({ stage }: { readonly stage: LessonStage }) {
  return (
    <p
      data-testid="stage-principle"
      className="w-full max-w-md rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-left text-xs leading-relaxed text-emerald-900 dark:text-emerald-100"
    >
      <strong>🔑 원리</strong> {STAGE_PRINCIPLES[stage]}
    </p>
  );
}

function FormulaRow({ card }: { readonly card: FormulaCard }) {
  return (
    <li className="flex flex-col gap-0.5 rounded-md border bg-background/90 p-2 text-left">
      <span className="text-sm font-semibold text-primary">{card.name}</span>
      <span className="text-xs font-medium text-foreground">{card.rhythm}</span>
      <span className="text-[11px] text-muted-foreground">{card.when}</span>
    </li>
  );
}

/** 단계를 마쳤을 때 그 단계에서 쓴 공식을 다시 보여 준다. 1단계는 원리를 보여 준다. */
export function StageRecap({ stage }: { readonly stage: LessonStage }) {
  const cards = STAGE_FORMULAS[stage];
  return (
    <div data-testid="stage-recap" className="flex w-full max-w-sm flex-col gap-1.5">
      <p className="text-xs font-semibold text-foreground">
        {cards.length > 0 ? "📒 이번 단계에서 쓴 공식" : "📒 이번 단계에서 배운 것"}
      </p>
      {cards.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {cards.map((card) => (
            <FormulaRow key={card.name} card={card} />
          ))}
        </ul>
      ) : (
        <p className="rounded-md border bg-background/90 p-2 text-left text-xs text-muted-foreground">
          {STAGE_PRINCIPLES[stage]}
        </p>
      )}
      <p className="text-[11px] text-muted-foreground">
        다음 판에서는 화면을 보기 전에 먼저 떠올려 보세요!
      </p>
    </div>
  );
}

/** 7단계를 모두 마쳤을 때 2–7단계 공식을 한데 모아 보여 준다. */
export function FormulaNotebook() {
  const stages: LessonStage[] = [2, 3, 4, 5, 6, 7];
  return (
    <div data-testid="formula-notebook" className="flex w-full max-w-sm flex-col gap-1.5">
      <p className="text-sm font-semibold text-foreground">📒 나의 공식 수첩</p>
      <ul className="flex flex-col gap-1.5">
        {stages.flatMap((stage) =>
          STAGE_FORMULAS[stage].map((card) => (
            <li key={`${stage}-${card.name}`} className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-muted-foreground">{stage}단계</span>
              <ul>
                <FormulaRow card={card} />
              </ul>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
