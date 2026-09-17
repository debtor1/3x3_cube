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
import { isYellowCrossEdgesSolved } from "./yellow-cross-edges";

export type YellowCornersPosCase = "none" | "one" | "all";

export type YellowCornersPosAction =
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
      readonly repeatIndex?: number;
      readonly totalRepeats?: number;
      readonly formulaGoal?: string;
      readonly posCase?: YellowCornersPosCase;
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
      readonly posCase?: YellowCornersPosCase;
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
      readonly posCase?: YellowCornersPosCase;
      apply(cube: Cube): Cube;
    };

export type CornerSlot = {
  readonly name: string;
  readonly pos: Vec3;
  readonly faces: readonly Face[];
  readonly label: string;
};

export const CORNER_SLOTS: readonly CornerSlot[] = [
  { name: "URF", pos: [1, 1, 1], faces: ["U", "R", "F"], label: "오른쪽 앞 꼭짓점" },
  { name: "UBR", pos: [1, 1, -1], faces: ["U", "B", "R"], label: "오른쪽 뒤 꼭짓점" },
  { name: "ULB", pos: [-1, 1, -1], faces: ["U", "L", "B"], label: "왼쪽 뒤 꼭짓점" },
  { name: "UFL", pos: [-1, 1, 1], faces: ["U", "F", "L"], label: "왼쪽 앞 꼭짓점" },
];

const FACE_NORMALS: Record<Face, Vec3> = {
  U: [0, 1, 0],
  R: [1, 0, 0],
  F: [0, 0, 1],
  D: [0, -1, 0],
  L: [-1, 0, 0],
  B: [0, 0, -1],
};

/** 특정 꼭짓점 조각이 제자리(세 면의 중심 색과 조각의 3개 색이 일치)에 있는지 판정한다. */
export function isCornerAtHome(cube: Cube, slot: CornerSlot): boolean {
  const centerColors = new Set(slot.faces.map((f) => cube[FACES.indexOf(f) * 9 + 4]));
  const stickerColors = new Set(
    slot.faces.map((f) => {
      const idx = stickerIndexOf(slot.pos, FACE_NORMALS[f]);
      return cube[idx!];
    })
  );
  for (const c of centerColors) {
    if (!stickerColors.has(c)) return false;
  }
  return true;
}

/** 현재 상태에서 제자리에 있는 꼭짓점 슬롯들의 목록을 반환한다. */
export function getHomeCorners(cube: Cube): CornerSlot[] {
  return CORNER_SLOTS.filter((s) => isCornerAtHome(cube, s));
}

/** 6단계: 1~5단계가 완료되어 있고 윗면 4개 꼭짓점이 모두 제자리에 있는지 판정한다. */
export function isYellowCornersPosSolved(cube: Cube): boolean {
  const uCenter = cube[FACES.indexOf("U") * 9 + 4];
  const dCenter = cube[FACES.indexOf("D") * 9 + 4];

  let c = cube;
  if (uCenter === "U" && dCenter === "D") {
    c = rotateCubeX180(cube);
  }

  if (!isYellowCrossEdgesSolved(c)) return false;

  const home = getHomeCorners(c);
  return home.length === 4;
}

/** Niklas 8동작 공식의 기본 동작 정의 */
const NIKLAS_STEPS: readonly {
  move: Move;
  reason: string;
  rhythm: string;
}[] = [
  { move: { face: "U", clockwise: true }, reason: "윗면을 왼쪽으로 돌려요", rhythm: "돌리고" },
  { move: { face: "R", clockwise: true }, reason: "오른쪽 면을 위로 올려요", rhythm: "올리고" },
  { move: { face: "U", clockwise: false }, reason: "윗면을 오른쪽으로 돌려요", rhythm: "돌리고" },
  { move: { face: "L", clockwise: false }, reason: "왼쪽 면을 위로 올려요", rhythm: "올리고" },
  { move: { face: "U", clockwise: true }, reason: "윗면을 왼쪽으로 돌려요", rhythm: "돌리고" },
  { move: { face: "R", clockwise: false }, reason: "오른쪽 면을 아래로 내려요", rhythm: "내리고" },
  { move: { face: "U", clockwise: false }, reason: "윗면을 오른쪽으로 돌려요", rhythm: "돌리고" },
  { move: { face: "L", clockwise: true }, reason: "왼쪽 면을 아래로 내려요", rhythm: "내리고" },
];

/** 6단계: 노란 꼭짓점 4개를 모두 제자리로 맞추는 액션 시퀀스를 생성한다. */
export function solveYellowCornersPos(cube: Cube): {
  actions: YellowCornersPosAction[];
} {
  const actions: YellowCornersPosAction[] = [];
  let current = cube;

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

  // 최대 5회 시도 (이론상 최대 3회 내에 100% 완료)
  for (let loop = 0; loop < 5; loop++) {
    const home = getHomeCorners(current);
    if (home.length === 4) {
      break;
    }

    if (home.length === 0) {
      // 경우 A: 맞는 꼭짓점이 0개
      // 아무 방향에서나 Niklas 1회 적용 ➔ 반드시 1개가 제자리에 오게 됨
      const situation = "제자리에 맞는 꼭짓점이 하나도 없어요";
      const condition = "어느 방향에서나 공식을 1번 써서 맞는 꼭짓점 1개를 만들어요";
      const pieceGuide: PieceGuide = { to: "윗면 꼭짓점들" };
      const indicators: PieceIndicator[] = CORNER_SLOTS.map((slot) => ({
        position: slot.pos,
        label: slot.label,
        type: "source",
      }));

      for (let i = 0; i < NIKLAS_STEPS.length; i++) {
        const step = NIKLAS_STEPS[i];
        actions.push({
          type: "move",
          move: step.move,
          reason: step.reason,
          situation,
          condition,
          pieceGuide,
          indicators,
          formula: "노란 꼭짓점 공식",
          formulaIndex: i + 1,
          totalInFormula: 8,
          posCase: "none",
        });
        current = applyMove(current, step.move);
      }
    } else {
      // 경우 B: 1개 이상 맞는 꼭짓점이 있음 (가장 흔함: 1개 맞음)
      const targetSlot = home[0];

      // 제자리인 꼭짓점을 URF(오른쪽 앞)로 가져오기 위해 큐브를 통째로 돌림
      if (targetSlot.name === "UBR") {
        // UBR -> URF: 위에서 볼 때 시계 방향으로 90도 회전
        const rotAction: YellowCornersPosAction = {
          type: "rotateCube",
          clockwise: true,
          reason: "제자리에 있는 꼭짓점을 오른쪽 앞(오른손 앞)으로 보려고 큐브를 돌려요",
          situation: "제자리에 있는 꼭짓점이 오른쪽 뒤에 있어요",
          condition: "맞은 꼭짓점을 오른쪽 앞(오른손 앞)에 두어야 해요",
          pieceGuide: { to: "오른쪽 앞" },
          indicators: [
            { position: targetSlot.pos, label: "제자리 꼭짓점", type: "target" },
          ],
          posCase: "one",
          apply: (c: Cube) => rotateCubeY(c, true),
        };
        actions.push(rotAction);
        current = rotAction.apply(current);
      } else if (targetSlot.name === "ULB") {
        // ULB -> URF: 180도 회전 (시계 2회)
        for (let r = 0; r < 2; r++) {
          const rotAction: YellowCornersPosAction = {
            type: "rotateCube",
            clockwise: true,
            reason: "제자리에 있는 꼭짓점을 오른쪽 앞(오른손 앞)으로 보려고 큐브를 돌려요",
            situation: "제자리에 있는 꼭짓점이 왼쪽 뒤에 있어요",
            condition: "맞은 꼭짓점을 오른쪽 앞(오른손 앞)에 두어야 해요",
            pieceGuide: { to: "오른쪽 앞" },
            indicators: [
              { position: targetSlot.pos, label: "제자리 꼭짓점", type: "target" },
            ],
            posCase: "one",
            apply: (c: Cube) => rotateCubeY(c, true),
          };
          actions.push(rotAction);
          current = rotAction.apply(current);
        }
      } else if (targetSlot.name === "UFL") {
        // UFL -> URF: 위에서 볼 때 반시계 방향으로 90도 회전
        const rotAction: YellowCornersPosAction = {
          type: "rotateCube",
          clockwise: false,
          reason: "제자리에 있는 꼭짓점을 오른쪽 앞(오른손 앞)으로 보려고 큐브를 돌려요",
          situation: "제자리에 있는 꼭짓점이 왼쪽 앞에 있어요",
          condition: "맞은 꼭짓점을 오른쪽 앞(오른손 앞)에 두어야 해요",
          pieceGuide: { to: "오른쪽 앞" },
          indicators: [
            { position: targetSlot.pos, label: "제자리 꼭짓점", type: "target" },
          ],
          posCase: "one",
          apply: (c: Cube) => rotateCubeY(c, false),
        };
        actions.push(rotAction);
        current = rotAction.apply(current);
      }

      // 이제 URF에 제자리 꼭짓점이 위치함
      const situation = "오른쪽 앞 꼭짓점이 제자리에 있어요";
      const condition = "제자리인 꼭짓점을 오른쪽 앞(오른손 앞)에 두고 공식을 써요";
      const pieceGuide: PieceGuide = { to: "오른쪽 앞 꼭짓점 (고정)" };
      const indicators: PieceIndicator[] = [
        { position: [1, 1, 1], label: "제자리 꼭짓점 (고정)", type: "target" },
        { position: [-1, 1, 1], label: "바꿀 꼭짓점", type: "source" },
        { position: [-1, 1, -1], label: "바꿀 꼭짓점", type: "source" },
        { position: [1, 1, -1], label: "바꿀 꼭짓점", type: "source" },
      ];

      for (let i = 0; i < NIKLAS_STEPS.length; i++) {
        const step = NIKLAS_STEPS[i];
        actions.push({
          type: "move",
          move: step.move,
          reason: step.reason,
          situation,
          condition,
          pieceGuide,
          indicators,
          formula: "노란 꼭짓점 공식",
          formulaIndex: i + 1,
          totalInFormula: 8,
          posCase: "one",
        });
        current = applyMove(current, step.move);
      }
    }
  }

  // 생성된 공식 액션들에 반복 회차 및 목표 주입
  const totalFormulaSets = actions.filter(
    (a) => a.type === "move" && a.formulaIndex === 1
  ).length;

  let formulaSetCount = 0;
  const annotatedActions: YellowCornersPosAction[] = actions.map((act) => {
    if (act.type === "move" && act.formulaIndex === 1) {
      formulaSetCount++;
    }
    if (act.formula) {
      const repeatIndex = formulaSetCount;
      const totalRepeats = totalFormulaSets;
      const formulaGoal =
        totalFormulaSets > 1
          ? `🎯 목표: 4개 꼭짓점이 모두 제자리를 찾을 때까지 반복해요 (${repeatIndex} / ${totalRepeats}회차)`
          : "🎯 목표: 4개 꼭짓점이 모두 제자리를 찾을 때까지 공식을 실행해요";

      return {
        ...act,
        repeatIndex,
        totalRepeats,
        formulaGoal,
      };
    }
    return act;
  });

  return { actions: annotatedActions };
}
