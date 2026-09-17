"use client";

import { useState } from "react";

import { ColorInput } from "@/components/cube/color-input";
import { CubeView } from "@/components/cube/cube-view";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isWhiteCrossSolved, solveWhiteCross } from "@/lib/cube/cross";
import { describeMove } from "@/lib/cube/guide";
import { canPaint } from "@/lib/cube/paint";
import { randomCube } from "@/lib/cube/scramble";
import {
  type Color,
  type Cube,
  FACES,
  type Move,
  applyMove,
  invertMove,
} from "@/lib/cube/state";
import { type CubeIssue, validateCube } from "@/lib/cube/validation";

type Turn = {
  readonly move: Move;
  readonly token: number;
  readonly forward: boolean;
};

/** 가운데 칸은 돌려도 자리를 바꾸지 않으므로 처음부터 채워 둔다. */
function blankPaint(): (Color | null)[] {
  const cells = Array<Color | null>(54).fill(null);
  FACES.forEach((face, position) => {
    cells[position * 9 + 4] = face;
  });
  return cells;
}

export function CrossTrainer() {
  const [painted, setPainted] = useState<(Color | null)[]>(blankPaint);
  const [selected, setSelected] = useState<Color>("U");
  const [issues, setIssues] = useState<readonly CubeIssue[]>([]);

  const [cube, setCube] = useState<Cube | null>(null);
  const [moves, setMoves] = useState<readonly Move[]>([]);
  const [step, setStep] = useState(0);
  const [turn, setTurn] = useState<Turn | null>(null);
  // 같은 수를 잇달아 돌릴 때도 회전이 새로 시작되도록 번호를 계속 올린다.
  const [issued, setIssued] = useState(0);

  const remaining = painted.filter((color) => color === null).length;
  const highlighted = new Set(issues.flatMap((issue) => issue.facelets));

  function start() {
    const facelets = painted.filter((color): color is Color => color !== null);
    if (facelets.length !== 54) return;

    const result = validateCube(facelets);
    if (!result.valid) {
      setIssues(result.issues);
      return;
    }

    setIssues([]);
    setCube(facelets);
    setMoves(solveWhiteCross(facelets));
    setStep(0);
  }

  function fillRandomly() {
    setPainted([...randomCube()]);
    setIssues([]);
  }

  function restart() {
    setCube(null);
    setMoves([]);
    setStep(0);
    setTurn(null);
    setIssued(0);
    setIssues([]);
    setPainted(blankPaint());
  }

  function runTurn(move: Move, forward: boolean) {
    const token = issued + 1;
    setIssued(token);
    setTurn({ move, forward, token });
  }

  function finishTurn() {
    if (!turn || !cube) return;
    setCube(applyMove(cube, turn.move));
    setStep((current) => (turn.forward ? current + 1 : current - 1));
    setTurn(null);
  }

  if (!cube) {
    return (
      <section className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">내 큐브 색을 알려 주세요</h1>
          <p className="text-sm text-muted-foreground">
            지금 손에 든 큐브와 똑같이 칠하면, 흰 십자가까지 가는 길을 알려 줄게요.
          </p>
        </header>

        <ColorInput
          painted={painted}
          selected={selected}
          onSelect={setSelected}
          onPaint={(index) => {
            setPainted((current) => {
              if (!canPaint(current, index, selected)) return current;
              const next = [...current];
              next[index] = selected;
              return next;
            });
            setIssues([]);
          }}
          highlighted={highlighted}
        />

        {issues.length > 0 ? (
          <Alert variant="destructive">
            <AlertTitle>이 큐브는 실제로 만들 수 없어요</AlertTitle>
            <AlertDescription>
              <ul className="flex flex-col gap-1">
                {issues.slice(0, 4).map((issue, position) => (
                  <li key={position}>{issue.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={start} disabled={remaining > 0}>
            길 찾기
          </Button>
          <Button type="button" variant="outline" onClick={fillRandomly}>
            무작위로 채우기
          </Button>
          <span className="text-sm text-muted-foreground">
            {remaining > 0 ? `${remaining}칸 더 칠하면 돼요` : "모두 칠했어요"}
          </span>
        </div>
      </section>
    );
  }

  const done = step >= moves.length;
  const shown = turn?.move ?? moves[step];
  const guide = shown ? describeMove(shown) : null;

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">
          {done ? "흰 십자가 완성!" : "이대로 따라 돌려 보세요"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {moves.length === 0
            ? "이미 흰 십자가가 다 맞춰져 있어요. 돌릴 것이 없어요."
            : done
              ? "네 조각의 옆면 색까지 모두 맞았어요."
              : `모두 ${moves.length}번 중 ${step + 1}번째`}
        </p>
      </header>

      <CubeView cube={cube} turning={turn} onTurnEnd={finishTurn} />

      <div
        className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg bg-muted p-4 text-center"
        aria-live="polite"
      >
        {guide ? (
          <>
            <span aria-hidden className="text-4xl leading-none">
              {guide.arrow}
            </span>
            <p className="text-lg font-medium">{guide.text}</p>
          </>
        ) : (
          <p className="text-lg font-medium">
            {isWhiteCrossSolved(cube)
              ? "윗면에 흰 십자가가 보이면 성공이에요."
              : "큐브 색을 다시 확인해 주세요."}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          onClick={() => runTurn(invertMove(moves[step - 1]), false)}
          disabled={turn !== null || step === 0}
        >
          이전 동작
        </Button>
        <Button
          onClick={() => runTurn(moves[step], true)}
          disabled={turn !== null || done}
        >
          다음 동작
        </Button>
        <Button variant="ghost" onClick={restart} disabled={turn !== null}>
          처음부터 다시
        </Button>
      </div>
    </section>
  );
}
