import type { PieceGuide, PieceIndicator } from "./face";
import { rotateCubeX180 } from "./second-layer";
import {
  applyMove,
  type Cube,
  FACES,
  type Move,
  stickerIndexOf,
  type Vec3,
} from "./state";

export type YellowCornersOrientAction =
  | {
      readonly type: "move";
      readonly move: Move;
      readonly reason: string;
      readonly situation?: string;
      readonly condition?: string;
      readonly pieceGuide?: PieceGuide;
      readonly indicators?: readonly PieceIndicator[];
      readonly formula?: string;
      readonly formulaIndex?: number; // 1 ~ 4
      readonly totalInFormula?: number; // 4
      readonly repeatIndex?: number;
      readonly totalRepeats?: number;
      readonly formulaGoal?: string;
      readonly isDisorderedTemporary?: boolean;
      readonly isUOnlyRotation?: boolean;
      readonly isFinalAlignment?: boolean;
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
      readonly repeatIndex?: number;
      readonly totalRepeats?: number;
      readonly formulaGoal?: string;
      readonly isDisorderedTemporary?: boolean;
      readonly isUOnlyRotation?: boolean;
      readonly isFinalAlignment?: boolean;
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
      readonly isDisorderedTemporary?: boolean;
      readonly isUOnlyRotation?: boolean;
      readonly isFinalAlignment?: boolean;
      apply(cube: Cube): Cube;
    };

export type CornerSlot = {
  readonly name: string;
  readonly pos: Vec3;
  readonly label: string;
};

export const CORNER_SLOTS: readonly CornerSlot[] = [
  { name: "URF", pos: [1, 1, 1], label: "오른쪽 앞 꼭짓점" },
  { name: "UBR", pos: [1, 1, -1], label: "오른쪽 뒤 꼭짓점" },
  { name: "ULB", pos: [-1, 1, -1], label: "왼쪽 뒤 꼭짓점" },
  { name: "UFL", pos: [-1, 1, 1], label: "왼쪽 앞 꼭짓점" },
];

/** 7단계: 여섯 면이 모두 자기 중심 색으로 덮였는지, 곧 큐브가 다 맞았는지 판정한다. */
export function isYellowCornersOrientSolved(cube: Cube): boolean {
  return FACES.every((face) => {
    const centerColor = cube[FACES.indexOf(face) * 9 + 4];
    for (let i = 0; i < 9; i++) {
      if (cube[FACES.indexOf(face) * 9 + i] !== centerColor) {
        return false;
      }
    }
    return true;
  });
}

/** URF 꼭짓점의 윗면(U) 스티커가 노란색(윗면 중심 색)인지 판정한다. */
function isURFYellowUp(cube: Cube): boolean {
  const uCenterColor = cube[FACES.indexOf("U") * 9 + 4];
  const urfUpStickerIdx = stickerIndexOf([1, 1, 1], [0, 1, 0]);
  return cube[urfUpStickerIdx!] === uCenterColor;
}

/** 윗면 4개 꼭짓점의 노란색이 모두 위를 향하고 있는지 판정한다. */
function areAllYellowCornersUp(cube: Cube): boolean {
  const uCenterColor = cube[FACES.indexOf("U") * 9 + 4];
  return CORNER_SLOTS.every((slot) => {
    const idx = stickerIndexOf(slot.pos, [0, 1, 0]);
    return cube[idx!] === uCenterColor;
  });
}

/** 2단계에서 배운 4동작 아랫면 트위스트 ("내리고 돌리고 올리고 돌리고") */
const D_TWIST_STEPS: readonly {
  move: Move;
  reason: string;
  rhythm: string;
}[] = [
  { move: { face: "R", clockwise: false }, reason: "오른쪽 면을 아래로 내려요", rhythm: "내리고" },
  { move: { face: "D", clockwise: false }, reason: "아랫면을 왼쪽으로 돌려요", rhythm: "돌리고" },
  { move: { face: "R", clockwise: true }, reason: "오른쪽 면을 위로 올려요", rhythm: "올리고" },
  { move: { face: "D", clockwise: true }, reason: "아랫면을 오른쪽으로 돌려요", rhythm: "돌리고" },
];

/** 7단계: 4개 꼭짓점의 방향을 맞추고 최종 6면을 완성하는 액션 시퀀스를 생성한다. */
export function solveYellowCornersOrient(cube: Cube): {
  actions: YellowCornersOrientAction[];
} {
  const actions: YellowCornersOrientAction[] = [];
  let current = cube;

  // 이미 큐브가 완전히 완성되어 있는 경우
  if (isYellowCornersOrientSolved(current)) {
    return { actions: [] };
  }

  // 흰 면이 위(U)에 있다면 180도 뒤집어서 시작
  const uCenter = current[FACES.indexOf("U") * 9 + 4];
  const dCenter = current[FACES.indexOf("D") * 9 + 4];
  if (uCenter === "U" && dCenter === "D") {
    current = rotateCubeX180(current);
    actions.push({
      type: "flipCube",
      reason: "노란 면이 위를 보도록 큐브를 위아래로 뒤집어요",
      situation: "흰 면이 위에 있어요",
      condition: "노란 십자가가 있는 윗면을 위로 두세요",
      apply: (c: Cube) => rotateCubeX180(c),
    });
  }

  // 1. 꼭짓점들의 노란색이 모두 위를 볼 때까지 URF에서 트위스트 반복 및 U 회전
  // 4개 꼭짓점을 순회하며 안 맞은 꼭짓점을 URF로 가져와 맞춤
  let maxLoop = 0;
  while (!areAllYellowCornersUp(current) && maxLoop < 40) {
    maxLoop++;

    // 만약 현재 URF가 이미 노란색이 위를 보고 있다면, 아직 안 맞은 꼭짓점이 올 때까지 윗면(U)을 돌림
    if (isURFYellowUp(current)) {
      const uMove: Move = { face: "U", clockwise: true };
      actions.push({
        type: "move",
        move: uMove,
        reason: "큐브를 돌리지 말고, 윗면만 왼쪽으로 돌려 안 맞은 꼭짓점을 가져와요",
        situation: "오른쪽 앞 꼭짓점이 이미 노란색이 위를 보고 있어요",
        condition: "절대로 큐브를 통째로 돌리지 마세요! 윗면만 돌려야 큐브가 복구돼요",
        pieceGuide: { to: "윗면만 왼쪽으로" },
        indicators: [
          { position: [1, 1, 1], label: "자리 확인", type: "source" },
        ],
        isUOnlyRotation: true,
      });
      current = applyMove(current, uMove);
      continue;
    }

    // URF 꼭짓점의 노란색이 위를 볼 때까지 트위스트(4동작) 반복 (2회 또는 4회)
    let totalTwistsForThisCorner = 0;
    let testCornerCube = current;
    while (!isURFYellowUp(testCornerCube) && totalTwistsForThisCorner < 6) {
      for (const step of D_TWIST_STEPS) {
        testCornerCube = applyMove(testCornerCube, step.move);
      }
      totalTwistsForThisCorner++;
    }

    let twistCount = 0;
    while (!isURFYellowUp(current)) {
      twistCount++;
      const repeatIndex = twistCount;
      const totalRepeats = totalTwistsForThisCorner;
      const formulaGoal = `🎯 목표: 오른쪽 앞 꼭짓점의 노란색이 위를 볼 때까지 반복해요 (${repeatIndex} / ${totalRepeats}회차)`;

      const situation = "오른쪽 앞 꼭짓점의 노란색이 위를 보지 않아요";
      const condition =
        "아랫면 트위스트를 반복해요. (아래층이 흐트러져 보이는 것은 정상이니 안심하세요!)";
      const pieceGuide: PieceGuide = { to: "오른쪽 앞 꼭짓점" };
      const uCenterColor = current[FACES.indexOf("U") * 9 + 4];

      const indicators: PieceIndicator[] = CORNER_SLOTS.map((slot) => {
        const isUp = current[stickerIndexOf(slot.pos, [0, 1, 0])!] === uCenterColor;
        if (slot.pos[0] === 1 && slot.pos[1] === 1 && slot.pos[2] === 1) {
          return { position: slot.pos, label: "맞출 꼭짓점", type: "target" as const };
        }
        return {
          position: slot.pos,
          label: isUp ? "완성된 꼭짓점" : "대기 꼭짓점",
          type: "source" as const,
        };
      });

      for (let i = 0; i < D_TWIST_STEPS.length; i++) {
        const step = D_TWIST_STEPS[i];
        actions.push({
          type: "move",
          move: step.move,
          reason: step.reason,
          situation,
          condition,
          pieceGuide,
          indicators,
          formula: "아랫면 트위스트",
          formulaIndex: i + 1,
          totalInFormula: 4,
          repeatIndex,
          totalRepeats,
          formulaGoal,
          isDisorderedTemporary: true,
        });
        current = applyMove(current, step.move);
      }
    }

    // URF 꼭짓점이 맞춰졌음!
    // 아직 다른 꼭짓점 중 노란색이 위를 보지 않은 것이 남아있다면 윗면(U)을 1회 돌려 넘김
    if (!areAllYellowCornersUp(current)) {
      const uMove: Move = { face: "U", clockwise: true };
      actions.push({
        type: "move",
        move: uMove,
        reason: "큐브를 돌리지 말고, 윗면만 왼쪽으로 돌려 다음 꼭짓점을 가져와요",
        situation: "오른쪽 앞 꼭짓점이 맞춰졌어요!",
        condition: "절대로 큐브를 통째로 돌리지 마세요! 오직 윗면만 돌리세요",
        pieceGuide: { to: "윗면만 왼쪽으로" },
        indicators: [
          { position: [1, 1, 1], label: "맞춤 완료", type: "target" },
        ],
        isUOnlyRotation: true,
      });
      current = applyMove(current, uMove);
    }
  }

  // 2. 마무리 윗면 정렬 회전 (Final Alignment)
  // 모든 꼭짓점의 노란색이 위를 보았으므로, 윗면을 0~3회 돌려 센터 색과 모서리 옆면 색을 일치시킴
  let uAlignCount = 0;
  while (!isYellowCornersOrientSolved(current) && uAlignCount < 4) {
    uAlignCount++;
    const uMove: Move = { face: "U", clockwise: true };
    actions.push({
      type: "move",
      move: uMove,
      reason: "윗면을 왼쪽으로 돌려 옆면 색을 가운데와 맞춰요",
      situation: "모든 노란 면이 위를 보았어요! 마지막 정렬만 남았습니다",
      condition: "윗면을 돌려 6면 전체를 완성하세요",
      pieceGuide: { to: "마무리 윗면 정렬" },
      isFinalAlignment: true,
    });
    current = applyMove(current, uMove);
  }

  return { actions };
}
