import type { PieceGuide, PieceIndicator } from "./face";
import { isSecondLayerSolved, rotateCubeX180 } from "./second-layer";
import {
  applyMove,
  type Cube,
  FACES,
  type Move,
  stickerIndexOf,
  type Vec3,
} from "./state";

export type YellowCrossCase = "dot" | "hook" | "line" | "cross";

export type YellowCrossAction =
  | {
      readonly type: "move";
      readonly move: Move;
      readonly reason: string;
      readonly situation?: string;
      readonly condition?: string;
      readonly pieceGuide?: PieceGuide;
      readonly indicators?: readonly PieceIndicator[];
      readonly formula?: string;
      readonly formulaIndex?: number; // 1 ~ 6
      readonly totalInFormula?: number; // 6
      readonly yellowCrossCase?: YellowCrossCase;
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
      readonly yellowCrossCase?: YellowCrossCase;
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
      readonly yellowCrossCase?: YellowCrossCase;
      apply(cube: Cube): Cube;
    };

const U_NORM: Vec3 = [0, 1, 0];
const UF_POS: Vec3 = [0, 1, 1];
const UR_POS: Vec3 = [1, 1, 0];
const UB_POS: Vec3 = [0, 1, -1];
const UL_POS: Vec3 = [-1, 1, 0];

type UEdgeState = {
  isUF: boolean;
  isUR: boolean;
  isUB: boolean;
  isUL: boolean;
  count: number;
};

function getUEdgeState(cube: Cube): UEdgeState {
  const yellowColor = cube[FACES.indexOf("U") * 9 + 4];
  const isUF = cube[stickerIndexOf(UF_POS, U_NORM)!] === yellowColor;
  const isUR = cube[stickerIndexOf(UR_POS, U_NORM)!] === yellowColor;
  const isUB = cube[stickerIndexOf(UB_POS, U_NORM)!] === yellowColor;
  const isUL = cube[stickerIndexOf(UL_POS, U_NORM)!] === yellowColor;
  const count = [isUF, isUR, isUB, isUL].filter(Boolean).length;
  return { isUF, isUR, isUB, isUL, count };
}

/** 윗면의 노란 십자가가 완성되었는지 판정한다 (1, 2층 완성 및 4개 모서리 노란색 일치). */
export function isYellowCrossSolved(cube: Cube): boolean {
  // 흰 면이 위(U)에 있다면 180도 뒤집어서 확인
  const uCenter = cube[FACES.indexOf("U") * 9 + 4];
  const dCenter = cube[FACES.indexOf("D") * 9 + 4];

  let c = cube;
  if (uCenter === "U" && dCenter === "D") {
    c = rotateCubeX180(cube);
  }

  if (!isSecondLayerSolved(c)) return false;

  const edgeState = getUEdgeState(c);
  return edgeState.count === 4;
}

/** 윗면 모서리의 노란색 배치 모양(점, ㄱ자, 일자, 십자가)을 판정한다. */
export function getYellowCrossCase(cube: Cube): YellowCrossCase {
  const uCenter = cube[FACES.indexOf("U") * 9 + 4];
  const dCenter = cube[FACES.indexOf("D") * 9 + 4];

  let c = cube;
  if (uCenter === "U" && dCenter === "D") {
    c = rotateCubeX180(cube);
  }

  const { isUF, isUR, isUB, isUL, count } = getUEdgeState(c);
  if (count === 4) return "cross";
  if (count === 2) {
    if ((isUF && isUB) || (isUR && isUL)) {
      return "line";
    }
    return "hook";
  }
  return "dot";
}

/** 4단계: 노란 십자가 풀이 수순을 계산한다. */
export function solveYellowCross(initialCube: Cube): { actions: YellowCrossAction[] } {
  const actions: YellowCrossAction[] = [];
  let cube = initialCube;

  // 1. 만약 흰 면이 위에 있다면 큐브를 180도 뒤집는다
  const uCenter = cube[FACES.indexOf("U") * 9 + 4];
  const dCenter = cube[FACES.indexOf("D") * 9 + 4];
  if (uCenter === "U" && dCenter === "D") {
    cube = rotateCubeX180(cube);
    actions.push({
      type: "flipCube",
      reason: "큐브를 위아래로 180도 뒤집어요",
      situation: "흰 면을 바닥에 두고 노란색 중심을 위로 봅니다.",
      condition: "노란 십자가는 노란 면을 위로 본 상태에서 만들어요.",
      pieceGuide: { to: "흰 면을 바닥으로 180도 뒤집기" },
      apply: (c: Cube) => rotateCubeX180(c),
    });
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
      yellowCrossCase?: YellowCrossCase;
    }
  ) {
    cube = applyMove(cube, move);
    actions.push({
      type: "move",
      move,
      reason: meta?.reason ?? "윗면을 돌려 모양을 맞춰요",
      situation: meta?.situation,
      condition: meta?.condition,
      pieceGuide: meta?.pieceGuide,
      indicators: meta?.indicators,
      formula: meta?.formula,
      formulaIndex: meta?.formulaIndex,
      totalInFormula: meta?.totalInFormula,
      yellowCrossCase: meta?.yellowCrossCase,
    });
  }

  // 6동작 노란 십자가 공식: F (R U R' U') F'
  function executeCrossFormula(currentCase: YellowCrossCase) {
    const formulaName = "노란 십자가 공식";
    const situation =
      currentCase === "dot"
        ? "가운데 노란 중심만 있는 '점' 모양이에요. 공식을 쓰면 ㄱ자 모양이 돼요."
        : currentCase === "hook"
          ? "모서리 2개가 노란색인 'ㄱ자' 모양이에요. 공식을 쓰면 일자 모양이 돼요."
          : "모서리 2개가 마주보는 '일자' 모양이에요. 공식을 쓰면 십자가가 완성돼요.";

    const condition =
      currentCase === "dot"
        ? "어느 방향에서나 바로 공식을 시작해요."
        : currentCase === "hook"
          ? "ㄱ자가 12시와 9시(뒤쪽과 왼쪽)를 가리키는 상태에서 공식을 시작해요."
          : "일자가 가로(수평)로 놓인 상태에서 공식을 시작해요.";

    let indicators: PieceIndicator[];
    let pieceGuide: PieceGuide;

    if (currentCase === "dot") {
      indicators = [
        { position: [0, 1, 0] as const, label: "노란 중심", type: "source" as const },
      ];
      pieceGuide = { from: "노란 중심점", to: "노란 ㄱ자 만들기" };
    } else if (currentCase === "hook") {
      // 12시(UB)와 9시(UL)에 있는 노란 모서리 2개
      indicators = [
        { position: UB_POS, label: "노란 모서리", type: "source" as const },
        { position: UL_POS, label: "노란 모서리", type: "source" as const },
      ];
      pieceGuide = { from: "노란 모서리 2개 (ㄱ자)", to: "노란 일자 만들기" };
    } else {
      // line (일자): 9시(UL)와 3시(UR)에 있는 노란 모서리 2개
      indicators = [
        { position: UL_POS, label: "노란 모서리", type: "source" as const },
        { position: UR_POS, label: "노란 모서리", type: "source" as const },
      ];
      pieceGuide = { from: "노란 모서리 2개 (일자)", to: "노란 십자가 완성" };
    }

    // 1. 앞면 눕히기 (F 시계 방향)
    doMove(
      { face: "F", clockwise: true },
      {
        formula: formulaName,
        formulaIndex: 1,
        totalInFormula: 6,
        yellowCrossCase: currentCase,
        reason: "앞면을 시계 방향으로 오른쪽으로 눕혀요",
        situation,
        condition,
        pieceGuide,
        indicators,
      }
    );

    // 2 ~ 5. 오른손 트위스트 (R U R' U')
    const twistMoves: { move: Move; text: string }[] = [
      { move: { face: "R", clockwise: true }, text: "오른손 트위스트 1: 오른쪽 면을 올려요" },
      { move: { face: "U", clockwise: true }, text: "오른손 트위스트 2: 윗면을 왼쪽으로 돌려요" },
      { move: { face: "R", clockwise: false }, text: "오른손 트위스트 3: 오른쪽 면을 내려요" },
      { move: { face: "U", clockwise: false }, text: "오른손 트위스트 4: 윗면을 오른쪽으로 돌려요" },
    ];

    twistMoves.forEach(({ move, text }, idx) => {
      doMove(move, {
        formula: formulaName,
        formulaIndex: 2 + idx,
        totalInFormula: 6,
        yellowCrossCase: currentCase,
        reason: text,
        situation,
        condition,
        pieceGuide,
        indicators,
      });
    });

    // 6. 앞면 세우기 (F' 반시계 방향)
    doMove(
      { face: "F", clockwise: false },
      {
        formula: formulaName,
        formulaIndex: 6,
        totalInFormula: 6,
        yellowCrossCase: currentCase,
        reason: "앞면을 반시계 방향으로 세워 원위치해요",
        situation,
        condition,
        pieceGuide,
        indicators,
      }
    );
  }

  let passes = 0;
  while (!isYellowCrossSolved(cube) && passes < 6) {
    passes++;
    const currentCase = getYellowCrossCase(cube);

    if (currentCase === "cross") {
      break;
    }

    if (currentCase === "dot") {
      // 점 모양: 정렬 회전 없이 바로 공식 실행
      executeCrossFormula("dot");
    } else if (currentCase === "hook") {
      // ㄱ자 모양: 12시(UB)와 9시(UL)에 배치되도록 회전
      const targetHookPositions: PieceIndicator[] = [
        { position: UB_POS, label: "12시 목표", type: "target" as const },
        { position: UL_POS, label: "9시 목표", type: "target" as const },
      ];

      const getHookAlignIndicators = (c: Cube): PieceIndicator[] => {
        const edgeState = getUEdgeState(c);
        const inds: PieceIndicator[] = [];
        if (edgeState.isUB) inds.push({ position: UB_POS, label: "노란 모서리", type: "source" });
        if (edgeState.isUL) inds.push({ position: UL_POS, label: "노란 모서리", type: "source" });
        if (edgeState.isUF) inds.push({ position: UF_POS, label: "노란 모서리", type: "source" });
        if (edgeState.isUR) inds.push({ position: UR_POS, label: "노란 모서리", type: "source" });

        if (!edgeState.isUB) inds.push(targetHookPositions[0]);
        if (!edgeState.isUL) inds.push(targetHookPositions[1]);
        return inds;
      };

      const doHookAlign = (move: Move) => {
        const indicators = getHookAlignIndicators(cube);
        doMove(move, {
          reason: "윗면을 돌려 노란색 ㄱ자가 12시와 9시 방향에 오도록 맞춰요",
          situation: "노란 모서리 2개가 뒤쪽과 왼쪽을 가리키도록 정렬해요.",
          condition: "ㄱ자 모양이 12시-9시를 볼 때 공식을 써야 일자가 돼요.",
          pieceGuide: { from: "노란 모서리 2개", to: "12시(뒤)와 9시(왼쪽)" },
          indicators,
          yellowCrossCase: "hook",
        });
      };

      const { isUF, isUR, isUB, isUL } = getUEdgeState(cube);
      if (isUB && isUL) {
        // 이미 12시-9시
      } else if (isUL && isUF) {
        // 9시-6시 -> U 1회
        doHookAlign({ face: "U", clockwise: true });
      } else if (isUF && isUR) {
        // 6시-3시 -> U 2회
        doHookAlign({ face: "U", clockwise: true });
        doHookAlign({ face: "U", clockwise: true });
      } else if (isUR && isUB) {
        // 3시-12시 -> U' 1회
        doHookAlign({ face: "U", clockwise: false });
      }

      executeCrossFormula("hook");
    } else if (currentCase === "line") {
      // 일자 모양: 가로(9시 UL와 3시 UR)로 오도록 회전
      const { isUF, isUB } = getUEdgeState(cube);

      if (isUF && isUB) {
        // 세로로 놓여 있음 -> U 1회로 가로 만들기
        const lineIndicators: PieceIndicator[] = [
          { position: UF_POS, label: "노란 모서리", type: "source" },
          { position: UB_POS, label: "노란 모서리", type: "source" },
          { position: UL_POS, label: "가로 목표", type: "target" },
          { position: UR_POS, label: "가로 목표", type: "target" },
        ];
        doMove(
          { face: "U", clockwise: true },
          {
            reason: "윗면을 돌려 노란색 일자가 가로 방향에 오도록 맞춰요",
            situation: "노란 모서리 2개가 가로(수평)로 놓이도록 정렬해요.",
            condition: "일자가 가로로 놓여 있을 때 공식을 써야 십자가가 완성돼요.",
            pieceGuide: { from: "노란 모서리 2개 (세로)", to: "가로(수평) 일자" },
            indicators: lineIndicators,
            yellowCrossCase: "line",
          }
        );
      }

      executeCrossFormula("line");
    }
  }

  return { actions };
}
