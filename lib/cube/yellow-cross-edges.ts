import type { PieceGuide, PieceIndicator } from "./face";
import { rotateCubeY } from "./face";
import { rotateCubeX180 } from "./second-layer";
import {
  applyMove,
  type Cube,
  FACES,
  type Face,
  type Move,
  stickerIndexOf,
  type Vec3,
} from "./state";
import { isYellowCrossSolved } from "./yellow-cross";

export type YellowCrossEdgesCase = "adjacent" | "opposite" | "all";

export type YellowCrossEdgesAction =
  | {
      readonly type: "move";
      readonly move: Move;
      readonly reason: string;
      readonly situation?: string;
      readonly condition?: string;
      readonly pieceGuide?: PieceGuide;
      readonly indicators?: readonly PieceIndicator[];
      readonly formula?: string;
      readonly formulaIndex?: number; // 1 ~ 8
      readonly totalInFormula?: number; // 8
      readonly edgesCase?: YellowCrossEdgesCase;
    }
  | {
      readonly type: "rotateCube";
      readonly clockwise: boolean;
      readonly reason: string;
      readonly situation?: string;
      readonly condition?: string;
      readonly pieceGuide?: PieceGuide;
      readonly indicators?: readonly PieceIndicator[];
      readonly formula?: string;
      readonly formulaIndex?: number;
      readonly totalInFormula?: number;
      readonly edgesCase?: YellowCrossEdgesCase;
      apply(cube: Cube): Cube;
    }
  | {
      readonly type: "flipCube";
      readonly reason: string;
      readonly situation?: string;
      readonly condition?: string;
      readonly pieceGuide?: PieceGuide;
      readonly indicators?: readonly PieceIndicator[];
      readonly formula?: string;
      readonly formulaIndex?: number;
      readonly totalInFormula?: number;
      readonly edgesCase?: YellowCrossEdgesCase;
      apply(cube: Cube): Cube;
    };

const U_EDGES: readonly { face: Face; pos: Vec3; sideNorm: Vec3; name: string }[] = [
  { face: "F", pos: [0, 1, 1], sideNorm: [0, 0, 1], name: "앞쪽" },
  { face: "R", pos: [1, 1, 0], sideNorm: [1, 0, 0], name: "오른쪽" },
  { face: "B", pos: [0, 1, -1], sideNorm: [0, 0, -1], name: "뒤쪽" },
  { face: "L", pos: [-1, 1, 0], sideNorm: [-1, 0, 0], name: "왼쪽" },
];

/** 5단계: 노란 십자가 모서리 4개의 옆면 색이 각 면 센터 색과 일치하는지 판정한다. */
export function isYellowCrossEdgesSolved(cube: Cube): boolean {
  const uCenter = cube[FACES.indexOf("U") * 9 + 4];
  const dCenter = cube[FACES.indexOf("D") * 9 + 4];

  let c = cube;
  if (uCenter === "U" && dCenter === "D") {
    c = rotateCubeX180(cube);
  }

  if (!isYellowCrossSolved(c)) return false;

  for (const edge of U_EDGES) {
    const sideColor = c[stickerIndexOf(edge.pos, edge.sideNorm)!];
    const centerColor = c[FACES.indexOf(edge.face) * 9 + 4];
    if (sideColor !== centerColor) {
      return false;
    }
  }

  return true;
}

/** 현재 상태에서 옆면 색이 센터와 일치하는 면들의 목록을 반환한다. */
export function getMatchedUEdges(cube: Cube): Face[] {
  const matched: Face[] = [];
  for (const edge of U_EDGES) {
    const sideColor = cube[stickerIndexOf(edge.pos, edge.sideNorm)!];
    const centerColor = cube[FACES.indexOf(edge.face) * 9 + 4];
    if (sideColor === centerColor) {
      matched.push(edge.face);
    }
  }
  return matched;
}

/** 윗면을 0~3번 돌려보며 일치하는 모서리 수가 가장 많은 최적의 정렬 각도를 찾는다. */
export function findBestUAlignment(cube: Cube): {
  uTurns: number; // 0, 1, 2, 3
  matched: Face[];
} {
  let bestTurns = 0;
  let bestMatched: Face[] = [];

  let testCube = cube;
  for (let turns = 0; turns < 4; turns++) {
    const matched = getMatchedUEdges(testCube);
    if (matched.length === 4) {
      return { uTurns: turns, matched };
    }
    if (matched.length > bestMatched.length) {
      bestTurns = turns;
      bestMatched = matched;
    }
    testCube = applyMove(testCube, { face: "U", clockwise: true });
  }

  return { uTurns: bestTurns, matched: bestMatched };
}

/** 일치하는 면 목록을 바탕으로 5단계 경우를 분류한다. */
export function getYellowCrossEdgesCase(matched: Face[]): YellowCrossEdgesCase {
  if (matched.length >= 4) return "all";

  const isAdjacent =
    (matched.includes("B") && matched.includes("R")) ||
    (matched.includes("R") && matched.includes("F")) ||
    (matched.includes("F") && matched.includes("L")) ||
    (matched.includes("L") && matched.includes("B"));

  if (isAdjacent) return "adjacent";
  return "opposite";
}

/** 5단계: 노란 십자가 모서리 옆면 색 맞추기 풀이를 생성한다. */
export function solveYellowCrossEdges(initialCube: Cube): {
  readonly actions: readonly YellowCrossEdgesAction[];
} {
  let cube = initialCube;
  const actions: YellowCrossEdgesAction[] = [];

  // 흰 면이 위(U)에 있다면 180도 뒤집어서 시작
  const uCenter = cube[FACES.indexOf("U") * 9 + 4];
  const dCenter = cube[FACES.indexOf("D") * 9 + 4];
  if (uCenter === "U" && dCenter === "D") {
    cube = rotateCubeX180(cube);
    actions.push({
      type: "flipCube",
      reason: "큐브를 위아래 180도 뒤집어 노란 면을 위로 올려요",
      situation: "흰 면을 바닥에 두고 노란 면을 올려다보며 5단계를 진행해요.",
      condition: "흰색 중심이 바닥(아래)에 있어야 해요.",
      apply: (c) => rotateCubeX180(c),
    });
  }

  if (isYellowCrossEdgesSolved(cube)) {
    return { actions: [] };
  }

  function doMove(
    move: Move,
    meta?: {
      reason?: string;
      situation?: string;
      condition?: string;
      pieceGuide?: PieceGuide;
      indicators?: readonly PieceIndicator[];
      formula?: string;
      formulaIndex?: number;
      totalInFormula?: number;
      edgesCase?: YellowCrossEdgesCase;
    }
  ) {
    cube = applyMove(cube, move);
    actions.push({
      type: "move",
      move,
      reason: meta?.reason ?? "윗면을 돌려요",
      situation: meta?.situation,
      condition: meta?.condition,
      pieceGuide: meta?.pieceGuide,
      indicators: meta?.indicators,
      formula: meta?.formula,
      formulaIndex: meta?.formulaIndex,
      totalInFormula: meta?.totalInFormula,
      edgesCase: meta?.edgesCase,
    });
  }

  function doRotateCube(
    clockwise: boolean,
    meta?: {
      reason?: string;
      situation?: string;
      condition?: string;
      pieceGuide?: PieceGuide;
      indicators?: readonly PieceIndicator[];
      edgesCase?: YellowCrossEdgesCase;
    }
  ) {
    cube = rotateCubeY(cube, clockwise);
    actions.push({
      type: "rotateCube",
      clockwise,
      reason:
        meta?.reason ??
        (clockwise
          ? "큐브를 통째로 오른쪽으로 돌려요"
          : "큐브를 통째로 왼쪽으로 돌려요"),
      situation: meta?.situation,
      condition: meta?.condition,
      pieceGuide: meta?.pieceGuide,
      indicators: meta?.indicators,
      edgesCase: meta?.edgesCase,
      apply: (c: Cube) => rotateCubeY(c, clockwise),
    });
  }

  const FORMULA_NAME = "올리고 돌리고 내리고 돌리고, 올리고 두 번 내리고";

  // 8동작 공식 실행 함수
  function executeEdgesFormula(edgesCase: YellowCrossEdgesCase) {
    const situation =
      edgesCase === "adjacent"
        ? "뒤쪽과 오른쪽 2개 면이 맞았어요. 앞쪽과 왼쪽 2개 모서리를 맞바꿔요."
        : "마주보는 2개 면이 맞았어요. 공식을 쓰면 이웃한 2개 면이 맞는 모양이 돼요.";

    const condition =
      edgesCase === "adjacent"
        ? "맞은 두 면을 뒤(12시)와 오른쪽(3시)에 두고 공식을 시작해요."
        : "맞은 두 면을 앞과 뒤에 두고 공식을 시작해요.";

    const pieceGuide: PieceGuide =
      edgesCase === "adjacent"
        ? { from: "앞쪽·왼쪽 모서리", to: "서로 자리 맞바꾸기" }
        : { from: "마주보는 모서리", to: "이웃한 모양 만들기" };

    const indicators: PieceIndicator[] =
      edgesCase === "adjacent"
        ? [
            { position: [0, 1, -1] as const, label: "맞은 모서리", type: "target" as const },
            { position: [1, 1, 0] as const, label: "맞은 모서리", type: "target" as const },
            { position: [0, 1, 1] as const, label: "바꿀 모서리", type: "source" as const },
            { position: [-1, 1, 0] as const, label: "바꿀 모서리", type: "source" as const },
          ]
        : [
            { position: [0, 1, 1] as const, label: "맞은 모서리", type: "target" as const },
            { position: [0, 1, -1] as const, label: "맞은 모서리", type: "target" as const },
            { position: [-1, 1, 0] as const, label: "바꿀 모서리", type: "source" as const },
            { position: [1, 1, 0] as const, label: "바꿀 모서리", type: "source" as const },
          ];

    const moves: { move: Move; reason: string }[] = [
      { move: { face: "R", clockwise: true }, reason: "오른쪽 면을 올려요" },
      { move: { face: "U", clockwise: true }, reason: "윗면을 왼쪽으로 돌려요" },
      { move: { face: "R", clockwise: false }, reason: "오른쪽 면을 내려요" },
      { move: { face: "U", clockwise: true }, reason: "윗면을 왼쪽으로 돌려요" },
      { move: { face: "R", clockwise: true }, reason: "오른쪽 면을 올려요" },
      { move: { face: "U", clockwise: true }, reason: "윗면을 왼쪽으로 두 번 돌려요 (첫 번째)" },
      { move: { face: "U", clockwise: true }, reason: "윗면을 왼쪽으로 두 번 돌려요 (두 번째)" },
      { move: { face: "R", clockwise: false }, reason: "오른쪽 면을 내려요" },
    ];

    moves.forEach(({ move, reason }, idx) => {
      doMove(move, {
        formula: FORMULA_NAME,
        formulaIndex: idx + 1,
        totalInFormula: 8,
        edgesCase,
        reason,
        situation,
        condition,
        pieceGuide,
        indicators,
      });
    });
  }

  let passes = 0;
  while (!isYellowCrossEdgesSolved(cube) && passes < 6) {
    passes++;

    // 1. 최적의 윗면 정렬 회전 찾기
    const { uTurns } = findBestUAlignment(cube);
    if (uTurns > 0) {
      for (let i = 0; i < uTurns; i++) {
        doMove(
          { face: "U", clockwise: true },
          {
            reason: "윗면을 돌려 옆면 색이 맞는 모서리를 찾아요",
            situation: "윗면을 돌려 중심 색과 일치하는 모서리를 최소 2개 이상 맞춰요.",
            condition: "윗면을 돌리다 보면 항상 2개 이상의 모서리가 맞아요.",
            pieceGuide: { from: "노란 모서리 옆면", to: "센터 색 일치" },
            indicators: [
              { position: [0, 1, 1], label: "앞쪽 모서리", type: "source" },
              { position: [1, 1, 0], label: "오른쪽 모서리", type: "source" },
              { position: [0, 1, -1], label: "뒤쪽 모서리", type: "source" },
              { position: [-1, 1, 0], label: "왼쪽 모서리", type: "source" },
            ],
          }
        );
      }
    }

    if (isYellowCrossEdgesSolved(cube)) {
      break;
    }

    const matched = getMatchedUEdges(cube);
    const edgesCase = getYellowCrossEdgesCase(matched);

    if (edgesCase === "adjacent") {
      // 맞은 두 면이 B(뒤)와 R(오른쪽)에 오도록 큐브 회전
      if (matched.includes("B") && matched.includes("R")) {
        // 이미 B와 R에 있음
      } else if (matched.includes("R") && matched.includes("F")) {
        // R과 F에 있음 -> 반시계 방향으로 90도 돌리면 R이 B로, F가 R로 이동
        doRotateCube(false, {
          reason: "맞은 두 면이 뒤쪽과 오른쪽에 오도록 큐브를 왼쪽으로 돌려요",
          situation: "맞은 면(오른쪽·앞쪽)을 뒤쪽과 오른쪽으로 보내기 위해 큐브를 돌려요.",
          condition: "맞은 두 면을 뒤(12시)와 오른쪽(3시)에 두어야 공식을 쓸 수 있어요.",
          pieceGuide: { from: "맞은 면 (오른쪽·앞쪽)", to: "뒤쪽과 오른쪽" },
          edgesCase: "adjacent",
        });
      } else if (matched.includes("F") && matched.includes("L")) {
        // F와 L에 있음 -> 180도 회전 (2회)
        doRotateCube(true, {
          reason: "맞은 두 면이 뒤쪽과 오른쪽에 오도록 큐브를 돌려요 (1/2)",
          edgesCase: "adjacent",
        });
        doRotateCube(true, {
          reason: "맞은 두 면이 뒤쪽과 오른쪽에 오도록 큐브를 돌려요 (2/2)",
          edgesCase: "adjacent",
        });
      } else if (matched.includes("L") && matched.includes("B")) {
        // L과 B에 있음 -> 시계 방향으로 90도 돌리면 L이 B로, B가 R로 이동
        doRotateCube(true, {
          reason: "맞은 두 면이 뒤쪽과 오른쪽에 오도록 큐브를 오른쪽으로 돌려요",
          situation: "맞은 면(왼쪽·뒤쪽)을 뒤쪽과 오른쪽으로 보내기 위해 큐브를 돌려요.",
          condition: "맞은 두 면을 뒤(12시)와 오른쪽(3시)에 두어야 공식을 쓸 수 있어요.",
          pieceGuide: { from: "맞은 면 (왼쪽·뒤쪽)", to: "뒤쪽과 오른쪽" },
          edgesCase: "adjacent",
        });
      }

      // 공식 8동작 실행
      executeEdgesFormula("adjacent");

      // 마무리 윗면 정렬 회전 (U 1회로 4면 완성)
      doMove(
        { face: "U", clockwise: true },
        {
          reason: "윗면을 돌려 네 면의 모서리 색을 최종 완성해요",
          situation: "모서리 자리가 모두 맞바뀌었어요. 윗면을 돌려 네 면의 색을 딱 맞춰요.",
          condition: "윗면을 한 번 돌리면 네 면의 색이 모두 중심과 일치해요.",
          pieceGuide: { from: "모서리 정렬", to: "4면 일치 완성" },
          indicators: [
            { position: [0, 1, 1], label: "맞은 모서리", type: "target" },
            { position: [1, 1, 0], label: "맞은 모서리", type: "target" },
            { position: [0, 1, -1], label: "맞은 모서리", type: "target" },
            { position: [-1, 1, 0], label: "맞은 모서리", type: "target" },
          ],
          edgesCase: "adjacent",
        }
      );
    } else if (edgesCase === "opposite") {
      // 마주보는 두 면: 맞은 면 중 하나가 B(뒤)에 오도록 회전
      if (matched.includes("L") && matched.includes("R")) {
        // L과 R이 맞은 상태 -> 시계 방향으로 90도 돌려 F와 B가 맞도록 함
        doRotateCube(true, {
          reason: "맞은 두 면이 앞쪽과 뒤쪽에 오도록 큐브를 오른쪽으로 돌려요",
          situation: "마주보는 맞은 면을 앞과 뒤에 두고 공식을 쓰기 위해 큐브를 돌려요.",
          condition: "맞은 두 면을 앞뒤에 두고 공식을 시작해요.",
          pieceGuide: { from: "맞은 면 (왼쪽·오른쪽)", to: "앞쪽과 뒤쪽" },
          edgesCase: "opposite",
        });
      }

      // 공식 8동작 실행 -> 이웃한 두 면 일치 상태로 바뀜
      executeEdgesFormula("opposite");
    }
  }

  return { actions };
}
