"use client";

import { type CSSProperties, useEffect, useState, useSyncExternalStore } from "react";

import { ColorInput } from "@/components/cube/color-input";
import { CubeView, type Turning } from "@/components/cube/cube-view";
import { StageProgress } from "@/components/cube/stage-progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isWhiteCrossSolved, solveWhiteCross } from "@/lib/cube/cross";
import {
  isWhiteFaceSolved,
  rotateCubeY,
  solveWhiteFace,
  type PieceGuide,
  type PieceIndicator,
} from "@/lib/cube/face";
import { describeFaceAction, describeMove } from "@/lib/cube/guide";
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
import {
  isSecondLayerSolved,
  rotateCubeX180,
  solveSecondLayer,
  type SecondLayerCase,
} from "@/lib/cube/second-layer";
import {
  isYellowCrossSolved,
  solveYellowCross,
  type YellowCrossCase,
} from "@/lib/cube/yellow-cross";
import {
  isYellowCrossEdgesSolved,
  solveYellowCrossEdges,
  type YellowCrossEdgesCase,
} from "@/lib/cube/yellow-cross-edges";
import {
  isYellowCornersPosSolved,
  solveYellowCornersPos,
  type YellowCornersPosCase,
} from "@/lib/cube/yellow-corners-pos";
import {
  isYellowCornersOrientSolved,
  solveYellowCornersOrient,
} from "@/lib/cube/yellow-corners-orient";

type UnifiedAction =
  | {
      readonly type: "move";
      readonly move: Move;
      readonly stage: 1 | 2 | 3 | 4 | 5 | 6 | 7;
      readonly reason: string;
      readonly situation?: string;
      readonly condition?: string;
      readonly pieceGuide?: PieceGuide;
      readonly indicators?: readonly PieceIndicator[];
      readonly formula?: string;
      readonly formulaIndex?: number;
      readonly totalInFormula?: number;
      readonly repeatIndex?: number;
      readonly totalRepeats?: number;
      readonly formulaGoal?: string;
      readonly cornerIndex?: number;
      readonly edgeIndex?: number;
      readonly secondLayerCase?: SecondLayerCase;
      readonly yellowCrossCase?: YellowCrossCase;
      readonly edgesCase?: YellowCrossEdgesCase;
      readonly posCase?: YellowCornersPosCase;
      readonly isDisorderedTemporary?: boolean;
      readonly isUOnlyRotation?: boolean;
      readonly isFinalAlignment?: boolean;
    }
  | {
      readonly type: "rotateCube";
      readonly clockwise: boolean;
      readonly stage: 2 | 3 | 4 | 5 | 6 | 7;
      readonly reason: string;
      readonly situation?: string;
      readonly condition?: string;
      readonly pieceGuide?: PieceGuide;
      readonly indicators?: readonly PieceIndicator[];
      readonly formula?: string;
      readonly formulaIndex?: number;
      readonly totalInFormula?: number;
      readonly repeatIndex?: number;
      readonly totalRepeats?: number;
      readonly formulaGoal?: string;
      readonly cornerIndex?: number;
      readonly edgeIndex?: number;
      readonly secondLayerCase?: SecondLayerCase;
      readonly yellowCrossCase?: YellowCrossCase;
      readonly edgesCase?: YellowCrossEdgesCase;
      readonly posCase?: YellowCornersPosCase;
      readonly isDisorderedTemporary?: boolean;
      readonly isUOnlyRotation?: boolean;
      readonly isFinalAlignment?: boolean;
      apply(cube: Cube): Cube;
    }
  | {
      readonly type: "flipCube";
      readonly stage: 3 | 4 | 5 | 6 | 7;
      readonly reason: string;
      readonly situation?: string;
      readonly condition?: string;
      readonly pieceGuide?: PieceGuide;
      readonly indicators?: readonly PieceIndicator[];
      readonly formula?: string;
      readonly formulaIndex?: number;
      readonly totalInFormula?: number;
      readonly repeatIndex?: number;
      readonly totalRepeats?: number;
      readonly formulaGoal?: string;
      readonly cornerIndex?: number;
      readonly edgeIndex?: number;
      readonly secondLayerCase?: SecondLayerCase;
      readonly yellowCrossCase?: YellowCrossCase;
      readonly edgesCase?: YellowCrossEdgesCase;
      readonly posCase?: YellowCornersPosCase;
      readonly isDisorderedTemporary?: boolean;
      readonly isUOnlyRotation?: boolean;
      readonly isFinalAlignment?: boolean;
      apply(cube: Cube): Cube;
    };

type TurnState = {
  readonly action: UnifiedAction;
  readonly forward: boolean;
  readonly token: number;
};

type HistoryEntry = {
  readonly action: UnifiedAction;
  readonly cubeBefore: Cube;
  readonly stageBefore: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  readonly stepBefore: number;
};

/** 가운데 칸은 돌려도 자리를 바꾸지 않으므로 처음부터 채워 둔다. */
function blankPaint(): (Color | null)[] {
  const cells = Array<Color | null>(54).fill(null);
  FACES.forEach((face, position) => {
    cells[position * 9 + 4] = face;
  });
  return cells;
}

/** 글자 크기 4단계: 축소(85%), 보통(100%), 확대(115%), 최대(130%) */
export const FONT_SCALES = [0.85, 1.0, 1.15, 1.3] as const;
/** 3D 큐브 크기 3단계: 축소(0.8x), 보통(1.0x), 확대(1.2x) */
export const CUBE_SCALES = [0.8, 1.0, 1.2] as const;

export const FONT_SCALE_STORAGE_KEY = "cube_trainer_font_scale_index";
export const CUBE_SCALE_STORAGE_KEY = "cube_trainer_cube_scale_index";

let fontScaleListeners: Array<() => void> = [];
let cubeScaleListeners: Array<() => void> = [];

export function setStoredFontScaleIndex(next: number) {
  try {
    localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(next));
  } catch {}
  fontScaleListeners.forEach((listener) => listener());
}

export function setStoredCubeScaleIndex(next: number) {
  try {
    localStorage.setItem(CUBE_SCALE_STORAGE_KEY, String(next));
  } catch {}
  cubeScaleListeners.forEach((listener) => listener());
}

function subscribeFontScale(callback: () => void) {
  fontScaleListeners.push(callback);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", callback);
  }
  return () => {
    fontScaleListeners = fontScaleListeners.filter((l) => l !== callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", callback);
    }
  };
}

function subscribeCubeScale(callback: () => void) {
  cubeScaleListeners.push(callback);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", callback);
  }
  return () => {
    cubeScaleListeners = cubeScaleListeners.filter((l) => l !== callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", callback);
    }
  };
}

function getStoredFontScaleIndex(): number {
  if (typeof window === "undefined") return 1;
  try {
    const saved = localStorage.getItem(FONT_SCALE_STORAGE_KEY);
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < FONT_SCALES.length) {
        return parsed;
      }
    }
  } catch {}
  return 1;
}

function getStoredCubeScaleIndex(): number {
  if (typeof window === "undefined") return 1;
  try {
    const saved = localStorage.getItem(CUBE_SCALE_STORAGE_KEY);
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < CUBE_SCALES.length) {
        return parsed;
      }
    }
  } catch {}
  return 1;
}

function ScaleControls({
  fontScaleIndex,
  cubeScaleIndex,
  onFontScaleDown,
  onFontScaleUp,
  onCubeScaleDown,
  onCubeScaleUp,
}: {
  readonly fontScaleIndex: number;
  readonly cubeScaleIndex: number;
  readonly onFontScaleDown: () => void;
  readonly onFontScaleUp: () => void;
  readonly onCubeScaleDown: () => void;
  readonly onCubeScaleUp: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 text-xs"
      aria-label="화면 크기 조절"
    >
      {/* 글자 크기 조절 */}
      <div className="flex items-center gap-1.5">
        <span className="font-medium text-muted-foreground select-none">글자</span>
        <div className="inline-flex items-center rounded-md border border-input bg-background p-0.5 shadow-xs">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-sm text-sm"
            onClick={onFontScaleDown}
            disabled={fontScaleIndex <= 0}
            aria-label="글자 크기 축소"
          >
            −
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-sm text-sm"
            onClick={onFontScaleUp}
            disabled={fontScaleIndex >= FONT_SCALES.length - 1}
            aria-label="글자 크기 확대"
          >
            +
          </Button>
        </div>
      </div>

      {/* 큐브 크기 조절 */}
      <div className="flex items-center gap-1.5">
        <span className="font-medium text-muted-foreground select-none">큐브</span>
        <div className="inline-flex items-center rounded-md border border-input bg-background p-0.5 shadow-xs">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-sm text-sm"
            onClick={onCubeScaleDown}
            disabled={cubeScaleIndex <= 0}
            aria-label="큐브 크기 축소"
          >
            −
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-sm text-sm"
            onClick={onCubeScaleUp}
            disabled={cubeScaleIndex >= CUBE_SCALES.length - 1}
            aria-label="큐브 크기 확대"
          >
            +
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CrossTrainer({
  initialPainted,
}: {
  readonly initialPainted?: readonly (Color | null)[];
} = {}) {
  const [painted, setPainted] = useState<(Color | null)[]>(() =>
    initialPainted ? [...initialPainted] : blankPaint()
  );
  const [selected, setSelected] = useState<Color>("U");
  const [issues, setIssues] = useState<readonly CubeIssue[]>([]);

  const [cube, setCube] = useState<Cube | null>(null);
  const [stage, setStage] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [stage1Actions, setStage1Actions] = useState<readonly UnifiedAction[]>([]);
  const [stage2Actions, setStage2Actions] = useState<readonly UnifiedAction[]>([]);
  const [stage3Actions, setStage3Actions] = useState<readonly UnifiedAction[]>([]);
  const [stage4Actions, setStage4Actions] = useState<readonly UnifiedAction[]>([]);
  const [stage5Actions, setStage5Actions] = useState<readonly UnifiedAction[]>([]);
  const [stage6Actions, setStage6Actions] = useState<readonly UnifiedAction[]>([]);
  const [stage7Actions, setStage7Actions] = useState<readonly UnifiedAction[]>([]);
  const [step, setStep] = useState(0);

  const [stage1CompletedWaiting, setStage1CompletedWaiting] = useState(false);
  const [stage2CompletedWaiting, setStage2CompletedWaiting] = useState(false);
  const [stage3CompletedWaiting, setStage3CompletedWaiting] = useState(false);
  const [stage4CompletedWaiting, setStage4CompletedWaiting] = useState(false);
  const [stage5CompletedWaiting, setStage5CompletedWaiting] = useState(false);
  const [stage6CompletedWaiting, setStage6CompletedWaiting] = useState(false);
  const [alreadySolved, setAlreadySolved] = useState<
    | "cross"
    | "face"
    | "secondLayer"
    | "yellowCross"
    | "yellowCrossEdges"
    | "yellowCornersPos"
    | "yellowCornersOrient"
    | null
  >(null);

  const [turn, setTurn] = useState<TurnState | null>(null);
  const [issued, setIssued] = useState(0);
  const [history, setHistory] = useState<readonly HistoryEntry[]>([]);

  const fontScaleIndex = useSyncExternalStore(
    subscribeFontScale,
    getStoredFontScaleIndex,
    () => 1
  );
  const cubeScaleIndex = useSyncExternalStore(
    subscribeCubeScale,
    getStoredCubeScaleIndex,
    () => 1
  );

  const handleFontScaleDown = () => {
    setStoredFontScaleIndex(Math.max(0, fontScaleIndex - 1));
  };

  const handleFontScaleUp = () => {
    setStoredFontScaleIndex(Math.min(FONT_SCALES.length - 1, fontScaleIndex + 1));
  };

  const handleCubeScaleDown = () => {
    setStoredCubeScaleIndex(Math.max(0, cubeScaleIndex - 1));
  };

  const handleCubeScaleUp = () => {
    setStoredCubeScaleIndex(Math.min(CUBE_SCALES.length - 1, cubeScaleIndex + 1));
  };

  const fontScale = FONT_SCALES[fontScaleIndex];
  const cubeScale = CUBE_SCALES[cubeScaleIndex];

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
    setHistory([]);
    setStep(0);

    // 0. 이미 7단계(큐브 6면 전체 완성)까지 다 맞았는지 확인
    if (isYellowCornersOrientSolved(facelets)) {
      setAlreadySolved("yellowCornersOrient");
      setStage(7);
      setStage1Actions([]);
      setStage2Actions([]);
      setStage3Actions([]);
      setStage4Actions([]);
      setStage5Actions([]);
      setStage6Actions([]);
      setStage7Actions([]);
      return;
    }

    // 1. 이미 6단계(노란 꼭짓점 자리)까지 다 맞았는지 확인 -> 곧바로 7단계 시작
    if (isYellowCornersPosSolved(facelets)) {
      setStage(7);
      setAlreadySolved(null);
      setStage1Actions([]);
      setStage2Actions([]);
      setStage3Actions([]);
      setStage4Actions([]);
      setStage5Actions([]);
      setStage6Actions([]);
      const orientResult = solveYellowCornersOrient(facelets);
      const unified: UnifiedAction[] = orientResult.actions.map((act) => ({
        ...act,
        stage: 7,
      }));
      setStage7Actions(unified);
      return;
    }

    // 2. 이미 5단계(노란 십자가 모서리 옆면)까지 다 맞았는지 확인 -> 곧바로 6단계 시작
    if (isYellowCrossEdgesSolved(facelets)) {
      setStage(6);
      setAlreadySolved(null);
      setStage1Actions([]);
      setStage2Actions([]);
      setStage3Actions([]);
      setStage4Actions([]);
      setStage5Actions([]);
      setStage7Actions([]);
      const cornersResult = solveYellowCornersPos(facelets);
      const unified: UnifiedAction[] = cornersResult.actions.map((act) => ({
        ...act,
        stage: 6,
      }));
      setStage6Actions(unified);
      return;
    }

    // 3. 이미 노란 십자가까지 다 맞았는지 확인 -> 곧바로 5단계 시작
    if (isYellowCrossSolved(facelets)) {
      setStage(5);
      setAlreadySolved(null);
      setStage1Actions([]);
      setStage2Actions([]);
      setStage3Actions([]);
      setStage4Actions([]);
      setStage6Actions([]);
      setStage7Actions([]);
      const edgesResult = solveYellowCrossEdges(facelets);
      const unified: UnifiedAction[] = edgesResult.actions.map((act) => ({
        ...act,
        stage: 5,
      }));
      setStage5Actions(unified);
      return;
    }

    // 4. 이미 2층까지 다 맞았는지 확인 -> 곧바로 4단계 시작
    if (isSecondLayerSolved(facelets)) {
      setStage(4);
      setAlreadySolved(null);
      setStage1Actions([]);
      setStage2Actions([]);
      setStage3Actions([]);
      setStage5Actions([]);
      setStage6Actions([]);
      setStage7Actions([]);
      const yellowResult = solveYellowCross(facelets);
      const unified: UnifiedAction[] = yellowResult.actions.map((act) => ({
        ...act,
        stage: 4,
      }));
      setStage4Actions(unified);
      return;
    }

    // 5. 이미 흰 면까지 다 맞았는지 확인 -> 곧바로 3단계 시작
    if (isWhiteFaceSolved(facelets)) {
      setStage(3);
      setAlreadySolved(null);
      setStage1Actions([]);
      setStage2Actions([]);
      setStage4Actions([]);
      setStage5Actions([]);
      setStage6Actions([]);
      setStage7Actions([]);
      const secondResult = solveSecondLayer(facelets);
      const unified: UnifiedAction[] = secondResult.actions.map((act) => ({
        ...act,
        stage: 3,
      }));
      setStage3Actions(unified);
      return;
    }

    // 6. 이미 흰 십자가가 다 맞았는지 확인 -> 곧바로 2단계 시작
    if (isWhiteCrossSolved(facelets)) {
      setStage(2);
      setAlreadySolved(null);
      setStage1Actions([]);
      const faceResult = solveWhiteFace(facelets);
      const unified: UnifiedAction[] = faceResult.actions.map((act) =>
        act.type === "move"
          ? { ...act, stage: 2 }
          : { ...act, stage: 2 }
      );
      setStage2Actions(unified);
      setStage3Actions([]);
      setStage4Actions([]);
      setStage5Actions([]);
      setStage6Actions([]);
      setStage7Actions([]);
      return;
    }

    // 7. 1단계부터 시작
    setAlreadySolved(null);
    setStage(1);
    const crossMoves = solveWhiteCross(facelets);
    const unifiedCross: UnifiedAction[] = crossMoves.map((move) => ({
      type: "move",
      move,
      stage: 1,
      reason: "흰 십자가를 맞춰요",
    }));
    setStage1Actions(unifiedCross);
    setStage2Actions([]);
    setStage3Actions([]);
    setStage4Actions([]);
    setStage5Actions([]);
    setStage6Actions([]);
    setStage7Actions([]);
    setStage1CompletedWaiting(false);
    setStage2CompletedWaiting(false);
    setStage3CompletedWaiting(false);
    setStage4CompletedWaiting(false);
    setStage5CompletedWaiting(false);
    setStage6CompletedWaiting(false);
  }

  function proceedToStage2() {
    if (!cube) return;
    setStage1CompletedWaiting(false);
    setStage(2);
    setStep(0);
    const faceResult = solveWhiteFace(cube);
    const unified: UnifiedAction[] = faceResult.actions.map((act) =>
      act.type === "move" ? { ...act, stage: 2 } : { ...act, stage: 2 }
    );
    setStage2Actions(unified);
  }

  function proceedToStage3() {
    if (!cube) return;
    setStage2CompletedWaiting(false);
    setStage(3);
    setStep(0);
    const secondResult = solveSecondLayer(cube);
    const unified: UnifiedAction[] = secondResult.actions.map((act) => ({
      ...act,
      stage: 3,
    }));
    setStage3Actions(unified);
  }

  function proceedToStage4() {
    if (!cube) return;
    setStage3CompletedWaiting(false);
    setStage(4);
    setStep(0);
    const yellowResult = solveYellowCross(cube);
    const unified: UnifiedAction[] = yellowResult.actions.map((act) => ({
      ...act,
      stage: 4,
    }));
    setStage4Actions(unified);
  }

  function proceedToStage5() {
    if (!cube) return;
    setStage4CompletedWaiting(false);
    setStage(5);
    setStep(0);
    const edgesResult = solveYellowCrossEdges(cube);
    const unified: UnifiedAction[] = edgesResult.actions.map((act) => ({
      ...act,
      stage: 5,
    }));
    setStage5Actions(unified);
  }

  function proceedToStage6() {
    if (!cube) return;
    setStage5CompletedWaiting(false);
    setStage(6);
    setStep(0);
    const cornersResult = solveYellowCornersPos(cube);
    const unified: UnifiedAction[] = cornersResult.actions.map((act) => ({
      ...act,
      stage: 6,
    }));
    setStage6Actions(unified);
  }

  function proceedToStage7() {
    if (!cube) return;
    setStage6CompletedWaiting(false);
    setStage(7);
    setStep(0);
    const orientResult = solveYellowCornersOrient(cube);
    const unified: UnifiedAction[] = orientResult.actions.map((act) => ({
      ...act,
      stage: 7,
    }));
    setStage7Actions(unified);
  }

  function fillRandomly() {
    setPainted([...randomCube()]);
    setIssues([]);
  }

  function restart() {
    setCube(null);
    setStage(1);
    setStage1Actions([]);
    setStage2Actions([]);
    setStage3Actions([]);
    setStage4Actions([]);
    setStage5Actions([]);
    setStage6Actions([]);
    setStage7Actions([]);
    setStep(0);
    setTurn(null);
    setIssued(0);
    setIssues([]);
    setHistory([]);
    setStage1CompletedWaiting(false);
    setStage2CompletedWaiting(false);
    setStage3CompletedWaiting(false);
    setStage4CompletedWaiting(false);
    setStage5CompletedWaiting(false);
    setStage6CompletedWaiting(false);
    setAlreadySolved(null);
    setPainted(blankPaint());
  }


  function runTurn(action: UnifiedAction, forward: boolean) {
    if (!cube) return;
    const token = issued + 1;
    setIssued(token);
    setTurn({ action, forward, token });
  }

  function finishTurn() {
    if (!turn || !cube) return;

    if (turn.forward) {
      // 앞으로 진행
      let nextCube: Cube;
      if (turn.action.type === "move") {
        nextCube = applyMove(cube, turn.action.move);
      } else {
        nextCube = turn.action.apply(cube);
      }

      setHistory((prev) => [
        ...prev,
        {
          action: turn.action,
          cubeBefore: cube,
          stageBefore: stage,
          stepBefore: step,
        },
      ]);

      setCube(nextCube);
      const nextStep = step + 1;
      setStep(nextStep);
      setTurn(null);

      // 1단계의 모든 수순을 끝냈다면 완성을 알리고 2단계 대기
      if (stage === 1 && nextStep >= stage1Actions.length) {
        setStage1CompletedWaiting(true);
      }
      // 2단계의 모든 수순을 끝냈다면 완성을 알리고 3단계 대기
      if (stage === 2 && nextStep >= stage2Actions.length) {
        setStage2CompletedWaiting(true);
      }
      // 3단계의 모든 수순을 끝냈다면 완성을 알리고 4단계 대기
      if (stage === 3 && nextStep >= stage3Actions.length) {
        setStage3CompletedWaiting(true);
      }
      // 4단계의 모든 수순을 끝냈다면 완성을 알리고 5단계 대기
      if (stage === 4 && nextStep >= stage4Actions.length) {
        setStage4CompletedWaiting(true);
      }
      // 5단계의 모든 수순을 끝냈다면 완성을 알리고 6단계 대기
      if (stage === 5 && nextStep >= stage5Actions.length) {
        setStage5CompletedWaiting(true);
      }
      // 6단계의 모든 수순을 끝냈다면 완성을 알리고 7단계 대기
      if (stage === 6 && nextStep >= stage6Actions.length) {
        setStage6CompletedWaiting(true);
      }
    } else {
      // 뒤로 되돌리기 (history 기반)
      if (history.length > 0) {
        const last = history[history.length - 1];
        setCube(last.cubeBefore);
        setStage(last.stageBefore);
        setStep(last.stepBefore);
        setStage1CompletedWaiting(false);
        setStage2CompletedWaiting(false);
        setStage3CompletedWaiting(false);
        setStage4CompletedWaiting(false);
        setStage5CompletedWaiting(false);
        setStage6CompletedWaiting(false);
        setHistory((prev) => prev.slice(0, -1));
      }
      setTurn(null);
    }
  }

  function handlePrev() {
    if (turn !== null || history.length === 0 || !cube) return;
    const last = history[history.length - 1];
    // 역동작 생성
    let reverseAction: UnifiedAction;
    if (last.action.type === "move") {
      reverseAction = {
        type: "move",
        move: invertMove(last.action.move),
        stage: last.action.stage,
        reason: "이전 동작으로 돌아가요",
      };
    } else if (last.action.type === "flipCube") {
      reverseAction = {
        type: "flipCube",
        stage: last.action.stage,
        reason: "이전 큐브 위치로 뒤집어요",
        apply: (c) => rotateCubeX180(c),
      };
    } else {
      const clockwise = last.action.clockwise;
      reverseAction = {
        type: "rotateCube",
        clockwise: !clockwise,
        stage: last.action.stage,
        reason: "이전 큐브 위치로 돌아가요",
        apply: (c) => rotateCubeY(c, !clockwise),
      };
    }
    runTurn(reverseAction, false);
  }

  function handleNext() {
    if (turn !== null) return;
    const currentActions =
      stage === 1
        ? stage1Actions
        : stage === 2
          ? stage2Actions
          : stage === 3
            ? stage3Actions
            : stage === 4
              ? stage4Actions
              : stage === 5
                ? stage5Actions
                : stage === 6
                  ? stage6Actions
                  : stage7Actions;
    if (step < currentActions.length) {
      runTurn(currentActions[step], true);
    }
  }

  function handleSkipStage() {
    if (turn !== null || !cube) return;

    if (stage === 1) {
      let nextCube = cube;
      for (let i = step; i < stage1Actions.length; i++) {
        const act = stage1Actions[i];
        if (act.type === "move") {
          nextCube = applyMove(nextCube, act.move);
        }
      }
      setCube(nextCube);
      setStage1CompletedWaiting(false);
      setStage(2);
      setStep(0);
      setHistory([]);
      const faceResult = solveWhiteFace(nextCube);
      const unified: UnifiedAction[] = faceResult.actions.map((act) => ({
        ...act,
        stage: 2,
      }));
      setStage2Actions(unified);
      return;
    }

    if (stage === 2) {
      let nextCube = cube;
      for (let i = step; i < stage2Actions.length; i++) {
        const act = stage2Actions[i];
        if (act.type === "move") {
          nextCube = applyMove(nextCube, act.move);
        } else {
          nextCube = act.apply(nextCube);
        }
      }
      setCube(nextCube);
      setStage2CompletedWaiting(false);
      setStage(3);
      setStep(0);
      setHistory([]);
      const secondResult = solveSecondLayer(nextCube);
      const unified: UnifiedAction[] = secondResult.actions.map((act) => ({
        ...act,
        stage: 3,
      }));
      setStage3Actions(unified);
      return;
    }

    if (stage === 3) {
      let nextCube = cube;
      for (let i = step; i < stage3Actions.length; i++) {
        const act = stage3Actions[i];
        if (act.type === "move") {
          nextCube = applyMove(nextCube, act.move);
        } else {
          nextCube = act.apply(nextCube);
        }
      }
      setCube(nextCube);
      setStage3CompletedWaiting(false);
      setStage(4);
      setStep(0);
      setHistory([]);
      const yellowResult = solveYellowCross(nextCube);
      const unified: UnifiedAction[] = yellowResult.actions.map((act) => ({
        ...act,
        stage: 4,
      }));
      setStage4Actions(unified);
      return;
    }

    if (stage === 4) {
      let nextCube = cube;
      for (let i = step; i < stage4Actions.length; i++) {
        const act = stage4Actions[i];
        if (act.type === "move") {
          nextCube = applyMove(nextCube, act.move);
        } else {
          nextCube = act.apply(nextCube);
        }
      }
      setCube(nextCube);
      setStage4CompletedWaiting(false);
      setStage(5);
      setStep(0);
      setHistory([]);
      const edgesResult = solveYellowCrossEdges(nextCube);
      const unified: UnifiedAction[] = edgesResult.actions.map((act) => ({
        ...act,
        stage: 5,
      }));
      setStage5Actions(unified);
      return;
    }

    if (stage === 5) {
      let nextCube = cube;
      for (let i = step; i < stage5Actions.length; i++) {
        const act = stage5Actions[i];
        if (act.type === "move") {
          nextCube = applyMove(nextCube, act.move);
        } else {
          nextCube = act.apply(nextCube);
        }
      }
      setCube(nextCube);
      setStage5CompletedWaiting(false);
      setStage(6);
      setStep(0);
      setHistory([]);
      const cornersResult = solveYellowCornersPos(nextCube);
      const unified: UnifiedAction[] = cornersResult.actions.map((act) => ({
        ...act,
        stage: 6,
      }));
      setStage6Actions(unified);
      return;
    }

    if (stage === 6) {
      let nextCube = cube;
      for (let i = step; i < stage6Actions.length; i++) {
        const act = stage6Actions[i];
        if (act.type === "move") {
          nextCube = applyMove(nextCube, act.move);
        } else {
          nextCube = act.apply(nextCube);
        }
      }
      setCube(nextCube);
      setStage6CompletedWaiting(false);
      setStage(7);
      setStep(0);
      setHistory([]);
      const orientResult = solveYellowCornersOrient(nextCube);
      const unified: UnifiedAction[] = orientResult.actions.map((act) => ({
        ...act,
        stage: 7,
      }));
      setStage7Actions(unified);
      return;
    }

    if (stage === 7) {
      let nextCube = cube;
      for (let i = step; i < stage7Actions.length; i++) {
        const act = stage7Actions[i];
        if (act.type === "move") {
          nextCube = applyMove(nextCube, act.move);
        } else {
          nextCube = act.apply(nextCube);
        }
      }
      setCube(nextCube);
      setStep(stage7Actions.length);
      setHistory([]);
      return;
    }
  }

  const currentActions =
    stage === 1
      ? stage1Actions
      : stage === 2
        ? stage2Actions
        : stage === 3
          ? stage3Actions
          : stage === 4
            ? stage4Actions
            : stage === 5
              ? stage5Actions
              : stage === 6
                ? stage6Actions
                : stage7Actions;
  const isStageDone = step >= currentActions.length;
  const isNextDisabled =
    turn !== null ||
    isStageDone ||
    stage1CompletedWaiting ||
    stage2CompletedWaiting ||
    stage3CompletedWaiting ||
    stage4CompletedWaiting ||
    stage5CompletedWaiting ||
    stage6CompletedWaiting;

  useEffect(() => {
    if (!cube || alreadySolved !== null) return;

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "Enter") {
        if (!isNextDisabled) {
          e.preventDefault();
          handleNext();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  if (!cube) {
    return (
      <section
        data-font-scale
        style={{ "--font-scale": fontScale } as CSSProperties}
        className="mx-auto w-full max-w-xl flex flex-col gap-6"
      >
        <header className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-semibold">내 큐브 색을 알려 주세요</h1>
            <ScaleControls
              fontScaleIndex={fontScaleIndex}
              cubeScaleIndex={cubeScaleIndex}
              onFontScaleDown={handleFontScaleDown}
              onFontScaleUp={handleFontScaleUp}
              onCubeScaleDown={handleCubeScaleDown}
              onCubeScaleUp={handleCubeScaleUp}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            지금 손에 든 큐브와 똑같이 칠하면, 완성까지 가는 길을 공식과 함께 알려 줄게요.
          </p>
        </header>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
          <p className="font-medium">💡 흰 십자가를 스스로 먼저 맞춰볼 수도 있어요!</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            십자가를 맞춘 뒤 색을 넣으면 1단계를 건너뛰고 2단계(흰 면 완성)부터 바로 시작해요.
          </p>
        </div>

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
            큐브 맞추기 시작
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

  // 큐브 가이드 화면
  const activeAction = turn?.action ?? (step < currentActions.length ? currentActions[step] : null);

  // turning prop for CubeView
  const turningProp: Turning | null = turn
    ? turn.action.type === "move"
      ? { move: turn.action.move, token: turn.token }
      : turn.action.type === "flipCube"
        ? { rotateCubeX180: true, token: turn.token }
        : { rotateCube: { clockwise: turn.action.clockwise }, token: turn.token }
    : null;

  // guide info
  const guide = activeAction
    ? activeAction.type === "move"
      ? describeMove(activeAction.move)
      : activeAction.type === "flipCube"
        ? { text: activeAction.reason, arrow: "🔃" }
        : describeFaceAction(activeAction)
    : null;

  const isAllSolved =
    alreadySolved === "yellowCornersOrient" || (stage === 7 && isStageDone);

  return (
    <section
      data-font-scale
      style={{ "--font-scale": fontScale } as CSSProperties}
      className="w-full flex flex-col gap-6"
    >
      <header className="flex flex-col gap-3">
        <StageProgress currentStage={stage} isAllSolved={isAllSolved} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {stage === 1
                ? "1단계: 흰 십자가"
                : stage === 2
                  ? "2단계: 흰 면 완성"
                  : stage === 3
                    ? "3단계: 2층 완성"
                    : stage === 4
                      ? "4단계: 노란 십자가"
                      : stage === 5
                        ? "5단계: 노란 십자가 옆면"
                        : stage === 6
                          ? "6단계: 노란 꼭짓점 자리"
                          : "7단계: 노란 꼭짓점 방향 (최종 완성)"}
            </span>
          </div>

          <ScaleControls
            fontScaleIndex={fontScaleIndex}
            cubeScaleIndex={cubeScaleIndex}
            onFontScaleDown={handleFontScaleDown}
            onFontScaleUp={handleFontScaleUp}
            onCubeScaleDown={handleCubeScaleDown}
            onCubeScaleUp={handleCubeScaleUp}
          />
        </div>

        <h1 className="text-xl font-semibold">
          {alreadySolved === "yellowCornersOrient"
            ? "3x3 큐브 완성!"
            : alreadySolved === "yellowCornersPos"
              ? "노란 꼭짓점 자리 완성!"
              : alreadySolved === "yellowCrossEdges"
                ? "노란 십자가 옆면 완성!"
                : alreadySolved === "yellowCross"
                  ? "노란 십자가 완성!"
                  : alreadySolved === "secondLayer"
                    ? "2층 완성!"
                    : alreadySolved === "face"
                      ? "흰 면 완성!"
                      : alreadySolved === "cross"
                        ? "흰 십자가 완성!"
                        : stage1CompletedWaiting
                          ? "흰 십자가 완성!"
                          : stage2CompletedWaiting
                            ? "흰 면 완성!"
                            : stage3CompletedWaiting
                              ? "2층 완성!"
                              : stage4CompletedWaiting
                                ? "노란 십자가 완성!"
                                : stage5CompletedWaiting
                                  ? "노란 십자가 옆면 완성!"
                                  : stage6CompletedWaiting
                                    ? "노란 꼭짓점 자리 완성!"
                                    : stage === 7 && isStageDone
                                      ? "🎉 3x3 큐브가 모두 완성되었어요!"
                                      : stage === 6 && isStageDone
                                        ? "노란 꼭짓점 자리 완성!"
                                        : stage === 5 && isStageDone
                                          ? "노란 십자가 옆면 완성!"
                                          : stage === 4 && isStageDone
                                            ? "노란 십자가 완성!"
                                            : stage === 3 && isStageDone
                                              ? "2층 완성!"
                                              : stage === 2 && isStageDone
                                                ? "흰 면 완성!"
                                                : "이대로 따라 돌려 보세요"}
        </h1>

        <p className="text-sm text-muted-foreground">
          {alreadySolved === "yellowCornersOrient"
            ? "이미 큐브가 모두 완성되어 있어요. 돌릴 것이 없어요."
            : alreadySolved === "yellowCornersPos"
              ? "이미 윗면 4개 꼭짓점이 모두 제자리에 맞춰져 있어요. 7단계를 시작해 볼까요?"
              : alreadySolved === "yellowCrossEdges"
                ? "이미 윗면 노란 십자가의 모서리 옆면 색까지 다 맞춰져 있어요. 6단계를 시작해 볼까요?"
                : alreadySolved === "yellowCross"
                  ? "이미 윗면 노란 십자가까지 다 맞춰져 있어요. 5단계를 시작해 볼까요?"
                  : alreadySolved === "secondLayer"
                    ? "이미 1층과 2층까지 다 맞춰져 있어요. 돌릴 것이 없어요."
                    : alreadySolved === "face"
                      ? "이미 흰 면까지 다 맞춰져 있어요. 돌릴 것이 없어요."
                      : alreadySolved === "cross"
                        ? "이미 흰 십자가가 다 맞춰져 있어요. 2단계를 시작해 볼까요?"
                        : stage1CompletedWaiting
                          ? "네 조각의 옆면 색까지 모두 맞았어요. 준비되면 2단계로 넘어가요."
                          : stage2CompletedWaiting
                            ? "흰 면과 1층이 맞았어요. 준비되면 3단계로 넘어가요."
                            : stage3CompletedWaiting
                              ? "1층과 2층이 모두 맞았어요. 준비되면 4단계로 넘어가요."
                              : stage4CompletedWaiting
                                ? "윗면 노란 십자가가 완성되었어요. 준비되면 5단계로 넘어가요."
                                : stage5CompletedWaiting
                                  ? "노란 십자가 옆면 색이 모두 맞았어요. 준비되면 6단계로 넘어가요."
                                  : stage6CompletedWaiting
                                    ? "윗면 4개 꼭짓점이 모두 제자리에 놓였어요. 준비되면 마지막 7단계로 넘어가요."
                                    : stage === 7 && isStageDone
                                      ? "축하합니다! 여섯 면의 모든 색이 완벽하게 맞춰졌어요."
                                      : stage === 6 && isStageDone
                                        ? "윗면 4개 꼭짓점이 모두 각자의 제자리에 놓였어요."
                                        : stage === 5 && isStageDone
                                          ? "노란 십자가 4개 모서리의 옆면 색이 각 면 중심과 모두 일치해요."
                                          : stage === 4 && isStageDone
                                            ? "윗면의 4개 모서리가 모두 노란색으로 맞춰졌어요."
                                            : stage === 3 && isStageDone
                                              ? "1층과 2층의 옆면 색이 각 면 중앙과 모두 일치해요."
                                              : stage === 2 && isStageDone
                                                ? "윗면 아홉 칸이 모두 흰색이고, 옆면 윗줄 세 칸이 각 면 중앙과 같은 색이에요."
                                                : stage === 1
                                                  ? `모두 ${stage1Actions.length}번 중 ${step + 1}번째`
                                                  : stage === 2
                                                    ? activeAction?.cornerIndex
                                                      ? `네 꼭짓점 중 ${activeAction.cornerIndex}번째 꼭짓점 맞추는 중`
                                                      : "안내에 따라 돌려보세요"
                                                    : stage === 3
                                                      ? activeAction?.edgeIndex
                                                        ? `2층 모서리 4개 중 ${activeAction.edgeIndex}번째 모서리 맞추는 중`
                                                        : "안내에 따라 돌려보세요"
                                                      : stage === 4
                                                        ? activeAction?.yellowCrossCase
                                                          ? activeAction.yellowCrossCase === "dot"
                                                            ? "점 모양에서 노란 십자가 공식 진행 중"
                                                            : activeAction.yellowCrossCase === "hook"
                                                              ? "ㄱ자 모양에서 노란 십자가 공식 진행 중"
                                                              : "일자 모양에서 노란 십자가 공식 진행 중"
                                                          : "안내에 따라 돌려보세요"
                                                        : stage === 5
                                                          ? activeAction?.formula
                                                            ? "올리고 돌리고 내리고 돌리고, 올리고 두 번 내리고 공식 진행 중"
                                                            : "모서리 정렬 회전 진행 중"
                                                          : stage === 6
                                                            ? activeAction?.formula
                                                              ? "돌리고 올리고 돌리고 올리고, 돌리고 내리고 돌리고 내리고 공식 진행 중"
                                                              : "제자리 꼭짓점 정렬 회전 진행 중"
                                                            : activeAction?.isFinalAlignment
                                                              ? "마무리 윗면 정렬 회전 진행 중"
                                                              : activeAction?.isUOnlyRotation
                                                                ? "윗면만 돌려 다음 꼭짓점 가져오는 중"
                                                                : "아랫면 트위스트로 꼭짓점 방향 맞추는 중"}
        </p>
      </header>

      {/* 2열 본문 레이아웃 (모바일 세로 1열 / 데스크톱 가로 2열 분할) */}
      <div
        className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start"
        data-testid="guide-layout-container"
      >
        {/* 좌측 열: 3D 큐브 뷰 */}
        <div
          className="flex flex-col items-center justify-center lg:col-span-5 xl:col-span-5 lg:sticky lg:top-8"
          data-testid="cube-column"
        >
          <CubeView
            cube={cube}
            turning={turningProp}
            onTurnEnd={finishTurn}
            indicators={activeAction?.indicators}
            scale={cubeScale}
          />
        </div>

        {/* 우측 열: 안내 영역 및 조작 버튼군 */}
        <div
          className="flex flex-col gap-6 lg:col-span-7 xl:col-span-7"
          data-testid="guide-column"
        >
          {/* 안내 영역 */}
          <div
        className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg bg-muted p-4 text-center"
        aria-live="polite"
      >
        {stage1CompletedWaiting ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-lg font-medium text-primary">🎉 1단계 흰 십자가가 완성되었어요!</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              이제 십자가 사이의 빈 꼭짓점 4개를 채울 차례예요. 꼭짓점 조각의 옆면 색까지 함께 맞춰 흰 면과 1층을 완성해요.
            </p>
            <Button size="lg" onClick={proceedToStage2}>
              2단계: 흰 면 맞추러 가기
            </Button>
          </div>
        ) : stage2CompletedWaiting ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-lg font-medium text-primary">🎉 2단계 흰 면이 완성되었어요!</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              이제 큐브를 180도 뒤집어 흰 면을 바닥에 두고, 2층 모서리 4개를 맞출 차례예요.
            </p>
            <Button size="lg" onClick={proceedToStage3}>
              3단계: 2층 맞추러 가기
            </Button>
          </div>
        ) : stage3CompletedWaiting ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-lg font-medium text-primary">🎉 3단계 2층이 완성되었어요!</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              이제 윗면(노란 면)을 올려다보며 노란색 십자가(➕)를 만들 차례예요. 2단계의 오른손 트위스트를 활용한 6동작 공식으로 쉽게 완성할 수 있어요.
            </p>
            <Button size="lg" onClick={proceedToStage4}>
              4단계: 노란 십자가 맞추러 가기
            </Button>
          </div>
        ) : stage4CompletedWaiting ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-lg font-medium text-primary">🎉 4단계 노란 십자가가 완성되었어요!</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              이제 노란 십자가 4개 모서리의 옆면 색을 각 면의 중심 색과 맞출 차례예요. &quot;올리고 돌리고 내리고 돌리고, 올리고 두 번 내리고&quot; 공식으로 쉽게 완성할 수 있어요.
            </p>
            <Button size="lg" onClick={proceedToStage5}>
              5단계: 노란 십자가 옆면 맞추러 가기
            </Button>
          </div>
        ) : stage5CompletedWaiting ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-lg font-medium text-primary">🎉 5단계 노란 십자가 옆면이 완성되었어요!</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              이제 윗면 4개 꼭짓점을 각자의 제자리로 보낼 차례예요. &quot;돌리고 올리고 돌리고 올리고, 돌리고 내리고 돌리고 내리고&quot; 대칭 공식으로 쉽게 맞출 수 있어요.
            </p>
            <Button size="lg" onClick={proceedToStage6}>
              6단계: 노란 꼭짓점 자리 맞추러 가기
            </Button>
          </div>
        ) : stage6CompletedWaiting ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-lg font-medium text-primary">🎉 6단계 노란 꼭짓점 자리가 완성되었어요!</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              이제 2단계에서 배운 4동작 아랫면 트위스트(&quot;내리고 돌리고 올리고 돌리고&quot;)를 사용해 꼭짓점의 노란색을 위로 돌려 맞추고, 큐브 전체를 완성할 차례예요.
            </p>
            <Button size="lg" onClick={proceedToStage7}>
              7단계: 노란 꼭짓점 방향 맞추러 가기
            </Button>
          </div>
        ) : isStageDone && stage === 7 ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-xl font-bold text-primary">🎉 축하합니다! 3x3 큐브를 모두 완성했어요!</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              여섯 면의 모든 색이 완벽하게 맞춰졌습니다! 큐브를 자유롭게 돌려보며 완성된 모습을 감상해보세요.
            </p>
            <Button size="lg" onClick={restart}>
              다른 큐브 맞춰보기
            </Button>
          </div>
        ) : isStageDone && stage === 6 ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-lg font-medium text-primary">🎉 6단계 노란 꼭짓점 자리가 완성되었어요!</p>
            <p className="text-sm text-muted-foreground">
              윗면 4개 꼭짓점 조각이 모두 각자의 제자리에 놓였어요.
            </p>
            <Button size="lg" onClick={proceedToStage7}>
              7단계: 노란 꼭짓점 방향 맞추러 가기
            </Button>
          </div>
        ) : isStageDone && stage === 5 ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-lg font-medium text-primary">🎉 5단계 노란 십자가 옆면이 완성되었어요!</p>
            <p className="text-sm text-muted-foreground">
              노란 십자가 4개 모서리의 옆면 색이 앞, 오른쪽, 뒤, 왼쪽 각 면의 중심과 완벽하게 일치해요.
            </p>
            <Button size="lg" onClick={proceedToStage6}>
              6단계: 노란 꼭짓점 자리 맞추러 가기
            </Button>
          </div>
        ) : isStageDone && stage === 4 ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-lg font-medium text-primary">🎉 4단계 노란 십자가가 완성되었어요!</p>
            <p className="text-sm text-muted-foreground">
              1·2층이 흐트러지지 않은 채 윗면에 노란색 십자가 모양이 완성되었어요.
            </p>
            <Button size="lg" onClick={proceedToStage5}>
              5단계: 노란 십자가 옆면 맞추러 가기
            </Button>
          </div>
        ) : isStageDone && stage === 3 ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-lg font-medium text-primary">🎉 3단계 2층이 완성되었어요!</p>
            <p className="text-sm text-muted-foreground">
              흰색 바닥과 1층, 2층 옆면 색이 모두 맞춰졌어요.
            </p>
            <Button size="lg" onClick={proceedToStage4}>
              4단계: 노란 십자가 맞추러 가기
            </Button>
          </div>
        ) : isStageDone && stage === 2 ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-lg font-medium text-primary">🎉 2단계 흰 면이 완성되었어요!</p>
            <p className="text-sm text-muted-foreground">
              흰색 윗면과 1층 옆면 색이 모두 맞춰졌어요.
            </p>
            <Button size="lg" onClick={proceedToStage3}>
              3단계: 2층 맞추러 가기
            </Button>
          </div>
        ) : guide ? (
          <>
            {/* 2단계 / 3단계 / 4단계 / 5단계 / 6단계 / 7단계 설명 카드 및 공식 묶음 표시 */}
            {activeAction && (activeAction.stage === 2 || activeAction.stage === 3 || activeAction.stage === 4 || activeAction.stage === 5 || activeAction.stage === 6 || activeAction.stage === 7) ? (
              <div className="flex flex-col items-center gap-2 mb-2 w-full max-w-md">
                {/* 2단계 꼭짓점 맞추기 개념 요약 카드 */}
                {activeAction.stage === 2 ? (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-left w-full text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-primary flex items-center gap-1">
                        💡 꼭짓점(코너) 맞추기란?
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {activeAction.cornerIndex ? `${activeAction.cornerIndex} / 4 꼭짓점` : ""}
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      꼭짓점 조각은 <strong className="text-foreground font-medium">색이 3개</strong>(흰색+옆면 2색)예요. 단순히 흰색만 올리는 것이 아니라 옆면 색까지 중심과 맞춰 넣어야 <strong>흰 면 전체와 1층 옆면</strong>이 완성돼요!
                    </p>
                  </div>
                ) : null}

                {/* 3단계 2층 모서리 맞추기 개념 요약 카드 */}
                {activeAction.stage === 3 ? (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-left w-full text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-primary flex items-center gap-1">
                        💡 3단계: 2층 모서리 맞추기란?
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {activeAction.edgeIndex ? `${activeAction.edgeIndex} / 4 모서리` : ""}
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      흰 면을 바닥에 두고, 노란색이 없는 2층 모서리 조각 4개를 맞춰요. <strong>피하기와 트위스트(오른손/왼손)</strong>를 조합해 2층을 완성해요!
                    </p>
                  </div>
                ) : null}

                {/* 4단계 노란 십자가 맞추기 개념 요약 카드 */}
                {activeAction.stage === 4 ? (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-left w-full text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-primary flex items-center gap-1">
                        💡 4단계: 노란 십자가 맞추기란?
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {activeAction.yellowCrossCase === "dot"
                          ? "점 모양"
                          : activeAction.yellowCrossCase === "hook"
                            ? "ㄱ자 모양"
                            : activeAction.yellowCrossCase === "line"
                              ? "일자 모양"
                              : "십자가"}
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      윗면 꼭짓점(코너) 색은 상관없어요! 가운데 노란색 중심과 4개 모서리만 노란색 십자가 모양(➕)이 되면 완성이에요.
                      2단계의 오른손 트위스트를 감싸는 <strong>6동작 공식</strong>으로 점 ➔ ㄱ자 ➔ 일자 ➔ 십자가 순으로 맞춰요!
                    </p>
                  </div>
                ) : null}

                {/* 5단계 노란 십자가 모서리 옆면 맞추기 개념 요약 카드 */}
                {activeAction.stage === 5 ? (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-left w-full text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-primary flex items-center gap-1">
                        💡 5단계: 노란 십자가 옆면 맞추기란?
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {activeAction.edgesCase === "adjacent"
                          ? "이웃한 두 면 일치"
                          : activeAction.edgesCase === "opposite"
                            ? "마주보는 두 면 일치"
                            : "모서리 정렬"}
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      노란 십자가 4개 모서리의 옆면 색을 각 면 중심과 맞춰요. <strong>&quot;올리고 돌리고 내리고 돌리고, 올리고 두 번 내리고&quot;</strong> 공식으로 안 맞은 2개 모서리의 자리를 맞바꿔요!
                    </p>
                  </div>
                ) : null}

                {/* 6단계 노란 꼭짓점 자리 맞추기 개념 요약 카드 */}
                {activeAction.stage === 6 ? (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-left w-full text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-primary flex items-center gap-1">
                        💡 6단계: 노란 꼭짓점 자리 맞추기란?
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {activeAction.posCase === "one"
                          ? "1개 제자리 (오른쪽 앞 고정)"
                          : activeAction.posCase === "none"
                            ? "0개 제자리 (임의 방향)"
                            : "꼭짓점 정렬"}
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      꼭짓점 조각이 돌아가 있어도 괜찮아요! 조각이 가진 3가지 색이 주변 세 면의 중심 색과 같으면 &apos;제자리&apos;에 있는 거예요. <strong>&quot;돌리고 올리고 돌리고 올리고, 돌리고 내리고 돌리고 내리고&quot;</strong> 대칭 공식으로 4개 꼭짓점을 각자의 자리로 보내요!
                    </p>
                  </div>
                ) : null}

                {/* 7단계 노란 꼭짓점 방향 맞추기 개념 요약 카드 */}
                {activeAction.stage === 7 ? (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-left w-full text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-primary flex items-center gap-1">
                        💡 7단계: 노란 꼭짓점 방향 맞추기 (최종 완성!)
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      새로운 공식은 없어요! 2단계에서 배운 <strong>&quot;내리고 돌리고 올리고 돌리고&quot;</strong> 4동작을 반복해요. 꼭짓점이 맞으면 큐브를 돌리지 말고 <strong>윗면만 돌려</strong> 다음 꼭짓점을 가져와요!
                    </p>
                  </div>
                ) : null}

                {/* 7단계 안심 배지: 아래층 흐트러짐 임시 현상 안내 */}
                {activeAction.isDisorderedTemporary ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-left w-full text-xs text-amber-800 dark:text-amber-200 flex items-start gap-1.5">
                    <span className="shrink-0 text-sm">💡</span>
                    <p className="leading-relaxed">
                      <strong>안심하세요!</strong> 지금 아래층이 흐트러져 보이는 것은 지극히 정상이에요. 모든 꼭짓점을 끝까지 맞추면 마법처럼 완벽하게 다시 돌아옵니다!
                    </p>
                  </div>
                ) : null}

                {/* 7단계 윗면만 돌리기 경고 배지 */}
                {activeAction.isUOnlyRotation ? (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-left w-full text-xs text-rose-800 dark:text-rose-200 flex items-start gap-1.5">
                    <span className="shrink-0 text-sm">⚠️</span>
                    <p className="leading-relaxed">
                      <strong>큐브를 통째로 돌리지 마세요!</strong> 오직 <strong>윗면(위쪽 1층)만</strong> 돌려야 아래층이 깨지지 않고 복구돼요.
                    </p>
                  </div>
                ) : null}

                {/* 7단계 마무리 윗면 정렬 배지 */}
                {activeAction.isFinalAlignment ? (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-left w-full text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-1.5">
                    <span className="shrink-0 text-sm">✨</span>
                    <p className="leading-relaxed">
                      <strong>마지막 정렬!</strong> 윗면을 돌려 옆면 색과 가운데 중심 색을 맞추면 6면 전체가 완성돼요!
                    </p>
                  </div>
                ) : null}

                {/* 상황, 조건, 조각 안내 설명 카드 */}
                <div className="flex flex-col gap-1.5 rounded-lg border bg-background/90 p-3 text-left w-full shadow-xs">
                  {activeAction.situation ? (
                    <div className="flex items-start gap-2 text-xs">
                      <span className="rounded bg-secondary px-1.5 py-0.5 font-semibold text-secondary-foreground shrink-0">
                        지금 상황
                      </span>
                      <p className="text-foreground leading-relaxed">{activeAction.situation}</p>
                    </div>
                  ) : null}

                  {activeAction.condition ? (
                    <div className="flex items-start gap-2 text-xs">
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary shrink-0">
                        공식 조건
                      </span>
                      <p className="text-muted-foreground leading-relaxed">{activeAction.condition}</p>
                    </div>
                  ) : null}

                  {activeAction.pieceGuide ? (
                    <div className="flex items-center gap-2 text-xs border-t pt-2 mt-0.5">
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary shrink-0">
                        조각 위치
                      </span>
                      <div className="flex items-center gap-1.5 text-foreground font-medium flex-wrap">
                        {activeAction.pieceGuide.from ? (
                          <>
                            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-semibold text-amber-700 dark:text-amber-300">
                              {activeAction.pieceGuide.from}
                            </span>
                            <span className="text-primary font-bold text-sm">➔</span>
                          </>
                        ) : null}
                        <span className="rounded bg-blue-500/15 px-1.5 py-0.5 font-semibold text-blue-700 dark:text-blue-300">
                          {activeAction.pieceGuide.to}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* 큐브 뒤집기 또는 전체 회전 뱃지 */}
                {activeAction.type === "flipCube" ? (
                  <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    큐브 위아래 180도 뒤집기
                  </span>
                ) : activeAction.type === "rotateCube" && !activeAction.formula ? (
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    큐브 전체 회전
                  </span>
                ) : null}

                {activeAction.formula ? (
                  <div className="flex flex-col items-center gap-1.5 rounded-md border bg-background/80 px-3 py-2 shadow-sm text-center">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <span className="text-xs font-semibold text-primary">
                        {activeAction.formula} 공식
                      </span>
                      {activeAction.totalRepeats && activeAction.totalRepeats > 1 ? (
                        <span
                          data-testid="formula-repeat-badge"
                          className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary"
                        >
                          {activeAction.repeatIndex ?? 1} / {activeAction.totalRepeats}회차
                        </span>
                      ) : null}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: activeAction.totalInFormula ?? 4 }, (_, i) => i + 1).map((num) => (
                          <span
                            key={num}
                            data-testid={`formula-step-${num}`}
                            className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                              num === activeAction.formulaIndex
                                ? "bg-primary text-primary-foreground shadow"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {num}
                          </span>
                        ))}
                      </div>
                    </div>
                    {activeAction.formulaGoal ? (
                      <span
                        data-testid="formula-goal-text"
                        className="text-xs font-semibold text-foreground"
                      >
                        {activeAction.formulaGoal}
                      </span>
                    ) : null}
                    <span className="text-[11px] text-muted-foreground">
                      {activeAction.stage === 2
                        ? "네 동작을 한 묶음으로 돌리면 아래 조각이 위로 올라오면서 회전해요"
                        : activeAction.stage === 7
                          ? "내리고 ➔ 돌리고 ➔ 올리고 ➔ 돌리고 4동작을 반복해 노란색이 위를 보게 해요"
                          : activeAction.stage === 4
                            ? "앞면 눕히기 ➔ 오른손 트위스트 4동작 ➔ 앞면 세우기로 십자가를 만들어요"
                            : activeAction.stage === 5
                              ? "올리고 ➔ 돌리고 ➔ 내리고 ➔ 돌리고 ➔ 올리고 ➔ 두 번 돌리고 ➔ 내리고로 모서리 자리를 맞바꿔요"
                              : activeAction.stage === 6
                                ? "돌리고 ➔ 올리고 ➔ 돌리고 ➔ 올리고 ➔ 돌리고 ➔ 내리고 ➔ 돌리고 ➔ 내리고로 꼭짓점 자리를 맞바꿔요"
                                : activeAction.formula === "오른쪽 넣기"
                                  ? "피하기 ➔ 오른손 트위스트 ➔ 큐브 돌리기 ➔ 왼손 트위스트로 2층에 넣어요"
                                  : activeAction.formula === "왼쪽 넣기"
                                    ? "피하기 ➔ 왼손 트위스트 ➔ 큐브 돌리기 ➔ 오른손 트위스트로 2층에 넣어요"
                                    : "2층에 잘못 갇힌 조각을 윗면으로 꺼내기 위해 공식을 실행해요"}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs font-medium text-muted-foreground">
                    {activeAction.reason}
                  </p>
                )}
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <span aria-hidden className="text-4xl leading-none">
                {guide.arrow}
              </span>
              <p className="text-lg font-medium">{guide.text}</p>
            </div>
          </>
        ) : (
          <p className="text-lg font-medium">
            {isYellowCornersOrientSolved(cube)
              ? "축하합니다! 큐브 6면이 모두 완성되었어요."
              : isYellowCornersPosSolved(cube)
                ? "윗면 4개 꼭짓점이 모두 제자리에 맞춰졌어요."
                : isYellowCrossEdgesSolved(cube)
                  ? "노란 십자가 모서리 옆면 색이 모두 완성되었어요."
                  : isYellowCrossSolved(cube)
                    ? "윗면 노란 십자가가 완성되었어요."
                    : isSecondLayerSolved(cube)
                      ? "흰 면과 1층, 2층이 모두 완성되었어요."
                      : isWhiteFaceSolved(cube)
                        ? "흰 면과 1층이 모두 완성되었어요."
                        : isWhiteCrossSolved(cube)
                          ? "윗면에 흰 십자가가 완성되었어요."
                          : "큐브 색을 다시 확인해 주세요."}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={turn !== null || history.length === 0}
        >
          이전 동작
        </Button>
        <Button
          onClick={handleNext}
          title="다음 동작 (Enter)"
          aria-keyshortcuts="Enter"
          disabled={isNextDisabled}
        >
          다음 동작
        </Button>
        <Button
          variant="secondary"
          onClick={handleSkipStage}
          disabled={
            turn !== null ||
            alreadySolved !== null ||
            (stage === 7 && isStageDone)
          }
        >
          다음 단계로 건너뛰기
        </Button>
        <Button variant="ghost" onClick={restart} disabled={turn !== null}>
          처음부터 다시
        </Button>
      </div>
        </div>
      </div>
    </section>
  );
}

