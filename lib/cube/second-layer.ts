import {
  applyMove,
  type Cube,
  FACES,
  type Face,
  type Move,
  stickerAt,
  stickerIndexOf,
  faceletsOf,
  type Vec3,
} from "./state";
import type { PieceGuide, PieceIndicator } from "./face";

export type SecondLayerCase = "right" | "left" | "eject";

export type SecondLayerAction =
  | {
      readonly type: "move";
      readonly move: Move;
      readonly reason: string;
      readonly situation?: string;
      readonly condition?: string;
      readonly pieceGuide?: PieceGuide;
      readonly indicators?: readonly PieceIndicator[];
      readonly formula?: string;
      readonly formulaIndex?: number; // 1 ~ 10
      readonly totalInFormula?: number; // 10
      readonly edgeIndex?: number; // 1 ~ 4
      readonly secondLayerCase?: SecondLayerCase;
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
      readonly edgeIndex?: number;
      readonly secondLayerCase?: SecondLayerCase;
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
      readonly edgeIndex?: number;
      readonly secondLayerCase?: SecondLayerCase;
      apply(cube: Cube): Cube;
    };

const ALL_STICKERS = Array.from({ length: 54 }, (_, i) => stickerAt(i));

/** 큐브를 위아래(X축)로 180도 뒤집는다 (흰 면이 바닥 D로, 노란 면이 윗면 U로). */
export function rotateCubeX180(cube: Cube): Cube {
  const next: Face[] = Array(54).fill("U");
  for (let i = 0; i < 54; i++) {
    const s = ALL_STICKERS[i];
    const newPos: Vec3 = [s.position[0], -s.position[1], -s.position[2]];
    const newNorm: Vec3 = [s.normal[0], -s.normal[1], -s.normal[2]];
    const dest = stickerIndexOf(newPos, newNorm)!;
    next[dest] = cube[i];
  }
  return next;
}

/** 큐브를 통째로 Y축으로 90도 돌린다. */
export function rotateCubeY(cube: Cube, clockwise: boolean): Cube {
  const rotateCoord = clockwise
    ? ([x, y, z]: readonly [number, number, number]): [number, number, number] => [-z, y, x]
    : ([x, y, z]: readonly [number, number, number]): [number, number, number] => [z, y, -x];

  const next: Face[] = Array(54).fill("U");
  for (let i = 0; i < 54; i++) {
    const sticker = ALL_STICKERS[i];
    const newPos = rotateCoord(sticker.position);
    const newNorm = rotateCoord(sticker.normal);
    const destIndex = stickerIndexOf(newPos, newNorm)!;
    next[destIndex] = cube[i];
  }
  return next;
}

/** 1층과 2층이 모두 완성되었는지 판정한다 (흰색 바닥 또는 흰색 윗면 모두 지원). */
export function isSecondLayerSolved(cube: Cube): boolean {
  const checkSolved = (c: Cube): boolean => {
    // 1. D면(바닥) 전체가 같은 색이어야 함
    const dFace = faceletsOf(c, "D");
    const dColor = dFace[4];
    if (!dFace.every((col) => col === dColor)) return false;

    // 2. 4개 옆면의 1층(row 2: 6, 7, 8)과 2층(row 1: 3, 4, 5)이 센터 색(4)과 일치해야 함
    for (const face of ["F", "R", "B", "L"] as const) {
      const flets = faceletsOf(c, face);
      const center = flets[4];
      if (flets[6] !== center || flets[7] !== center || flets[8] !== center) {
        return false;
      }
      if (flets[3] !== center || flets[5] !== center) {
        return false;
      }
    }
    return true;
  };

  if (checkSolved(cube)) return true;
  if (checkSolved(rotateCubeX180(cube))) return true;

  return false;
}

const SECOND_LAYER_SLOTS = [
  { name: "FR", pos: [1, 0, 1] as Vec3, fFace: "F" as const, sideFace: "R" as const, fNorm: [0, 0, 1] as Vec3, sNorm: [1, 0, 0] as Vec3 },
  { name: "FL", pos: [-1, 0, 1] as Vec3, fFace: "F" as const, sideFace: "L" as const, fNorm: [0, 0, 1] as Vec3, sNorm: [-1, 0, 0] as Vec3 },
  { name: "BR", pos: [1, 0, -1] as Vec3, fFace: "B" as const, sideFace: "R" as const, fNorm: [0, 0, -1] as Vec3, sNorm: [1, 0, 0] as Vec3 },
  { name: "BL", pos: [-1, 0, -1] as Vec3, fFace: "B" as const, sideFace: "L" as const, fNorm: [0, 0, -1] as Vec3, sNorm: [-1, 0, 0] as Vec3 },
];

function isSlotSolved(c: Cube, slot: typeof SECOND_LAYER_SLOTS[number]): boolean {
  const fCenter = c[FACES.indexOf(slot.fFace) * 9 + 4];
  const sCenter = c[FACES.indexOf(slot.sideFace) * 9 + 4];

  const fIdx = stickerIndexOf(slot.pos, slot.fNorm)!;
  const sIdx = stickerIndexOf(slot.pos, slot.sNorm)!;

  return c[fIdx] === fCenter && c[sIdx] === sCenter;
}

function countSolvedSlots(c: Cube): number {
  return SECOND_LAYER_SLOTS.filter((slot) => isSlotSolved(c, slot)).length;
}

const U_EDGES = [
  { name: "UF", pos: [0, 1, 1] as Vec3, uNorm: [0, 1, 0] as Vec3, sideNorm: [0, 0, 1] as Vec3, sideFace: "F" as const, uMoveToUF: 0 },
  { name: "UR", pos: [1, 1, 0] as Vec3, uNorm: [0, 1, 0] as Vec3, sideNorm: [1, 0, 0] as Vec3, sideFace: "R" as const, uMoveToUF: 3 }, // U' (or U3) moves UR to UF
  { name: "UB", pos: [0, 1, -1] as Vec3, uNorm: [0, 1, 0] as Vec3, sideNorm: [0, 0, -1] as Vec3, sideFace: "B" as const, uMoveToUF: 2 }, // U2 moves UB to UF
  { name: "UL", pos: [-1, 1, 0] as Vec3, uNorm: [0, 1, 0] as Vec3, sideNorm: [-1, 0, 0] as Vec3, sideFace: "L" as const, uMoveToUF: 1 }, // U moves UL to UF
];

export function solveSecondLayer(initialCube: Cube): {
  readonly actions: readonly SecondLayerAction[];
} {
  let cube = initialCube;
  const actions: SecondLayerAction[] = [];

  // 1. 이미 완성되어 있는 경우
  if (isSecondLayerSolved(cube)) {
    return { actions: [] };
  }

  // 2. 만약 흰 면이 위에 있다면(2단계 직후 상태), 큐브를 180도 뒤집는다
  const uFace = faceletsOf(cube, "U");
  if (uFace.every((c) => c === "U")) {
    cube = rotateCubeX180(cube);
    actions.push({
      type: "flipCube",
      reason: "큐브를 위아래로 180도 뒤집어요",
      situation: "1단계와 2단계에서 맞춘 흰 면이 완성되었어요!",
      condition: "3단계에서는 흰 면을 바닥에 두고 노란색 중심을 위로 봅니다.",
      pieceGuide: { to: "흰 면을 바닥으로 180도 뒤집기" },
      edgeIndex: 1,
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
      edgeIndex?: number;
      secondLayerCase?: SecondLayerCase;
    }
  ) {
    cube = applyMove(cube, move);
    actions.push({
      type: "move",
      move,
      reason: meta?.reason ?? "윗면을 돌려 자리를 맞춰요",
      situation: meta?.situation,
      condition: meta?.condition,
      pieceGuide: meta?.pieceGuide,
      indicators: meta?.indicators,
      formula: meta?.formula,
      formulaIndex: meta?.formulaIndex,
      totalInFormula: meta?.totalInFormula,
      edgeIndex: meta?.edgeIndex,
      secondLayerCase: meta?.secondLayerCase,
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
      formula?: string;
      formulaIndex?: number;
      totalInFormula?: number;
      edgeIndex?: number;
      secondLayerCase?: SecondLayerCase;
    }
  ) {
    cube = rotateCubeY(cube, clockwise);
    actions.push({
      type: "rotateCube",
      clockwise,
      reason: meta?.reason ?? (clockwise ? "큐브를 통째로 오른쪽으로 돌려요" : "큐브를 통째로 왼쪽으로 돌려요"),
      situation: meta?.situation,
      condition: meta?.condition,
      pieceGuide: meta?.pieceGuide,
      indicators: meta?.indicators,
      formula: meta?.formula,
      formulaIndex: meta?.formulaIndex,
      totalInFormula: meta?.totalInFormula,
      edgeIndex: meta?.edgeIndex,
      secondLayerCase: meta?.secondLayerCase,
      apply: (c: Cube) => rotateCubeY(c, clockwise),
    });
  }

  function doRightInsert(edgeIndex: number, isEject = false) {
    const formulaName = isEject ? "2층에서 꺼내기" : "오른쪽 넣기";
    const layerCase: SecondLayerCase = isEject ? "eject" : "right";
    const situation = isEject
      ? "윗면에 넣을 조각이 없어, 2층에 잘못 끼어 있는 조각을 윗면으로 꺼내요."
      : "윗면 조각의 윗면 색이 오른쪽 중심 색과 같아요. 오른쪽 2층으로 넣어요.";
    const condition = isEject
      ? "잘못 들어간 2층 조각을 오른쪽 앞자리에 두고 꺼내기 공식을 써요."
      : "앞면 중앙과 T자를 맞춘 상태에서 오른쪽 넣기 공식을 시작해요.";
    const pieceGuide = isEject
      ? { from: "오른쪽 앞 2층", to: "윗면으로 꺼내기" }
      : { from: "윗면 앞쪽", to: "오른쪽 앞 2층" };
    const indicators: PieceIndicator[] = isEject
      ? [
          { position: [1, 0, 1] as const, label: "꺼낼 조각", type: "source" as const },
          { position: [0, 1, 1] as const, label: "윗면으로 탈출", type: "target" as const },
        ]
      : [
          { position: [0, 1, 1] as const, label: "맞출 모서리", type: "source" as const },
          { position: [1, 0, 1] as const, label: "목표 자리", type: "target" as const },
        ];

    // 1. 피하기: U (오른쪽으로 넣으므로 반대인 왼쪽으로 피함)
    doMove({ face: "U", clockwise: true }, {
      formula: formulaName,
      formulaIndex: 1,
      totalInFormula: 10,
      edgeIndex,
      secondLayerCase: layerCase,
      reason: "오른쪽으로 넣기 위해 윗면을 반대쪽(왼쪽)으로 피해요",
      situation,
      condition,
      pieceGuide,
      indicators,
    });

    // 2 ~ 5. 오른손 트위스트: R U R' U'
    const rightTwistMoves: Move[] = [
      { face: "R", clockwise: true },
      { face: "U", clockwise: true },
      { face: "R", clockwise: false },
      { face: "U", clockwise: false },
    ];
    rightTwistMoves.forEach((m, idx) => {
      doMove(m, {
        formula: formulaName,
        formulaIndex: 2 + idx,
        totalInFormula: 10,
        edgeIndex,
        secondLayerCase: layerCase,
        reason: "오른손 트위스트로 조각의 짝을 맞춰요",
        situation,
        condition,
        pieceGuide,
        indicators,
      });
    });

    // 6. 큐브 전체 회전: rotateCubeY(true)
    doRotateCube(true, {
      formula: formulaName,
      formulaIndex: 6,
      totalInFormula: 10,
      edgeIndex,
      secondLayerCase: layerCase,
      reason: "왼손 트위스트로 넣기 위해 큐브를 오른쪽으로 돌려요",
      situation,
      condition,
      pieceGuide,
      indicators,
    });

    // 7 ~ 10. 왼손 트위스트: L' U' L U
    const leftTwistMoves: Move[] = [
      { face: "L", clockwise: false },
      { face: "U", clockwise: false },
      { face: "L", clockwise: true },
      { face: "U", clockwise: true },
    ];
    leftTwistMoves.forEach((m, idx) => {
      doMove(m, {
        formula: formulaName,
        formulaIndex: 7 + idx,
        totalInFormula: 10,
        edgeIndex,
        secondLayerCase: layerCase,
        reason: "왼손 트위스트로 짝맞춘 조각을 2층 제자리에 쏙 넣어요",
        situation,
        condition,
        pieceGuide,
        indicators,
      });
    });
  }

  function doLeftInsert(edgeIndex: number) {
    const formulaName = "왼쪽 넣기";
    const layerCase: SecondLayerCase = "left";
    const situation = "윗면 조각의 윗면 색이 왼쪽 중심 색과 같아요. 왼쪽 2층으로 넣어요.";
    const condition = "앞면 중앙과 T자를 맞춘 상태에서 왼쪽 넣기 공식을 시작해요.";
    const pieceGuide = { from: "윗면 앞쪽", to: "왼쪽 앞 2층" };
    const indicators: PieceIndicator[] = [
      { position: [0, 1, 1] as const, label: "맞출 모서리", type: "source" as const },
      { position: [-1, 0, 1] as const, label: "목표 자리", type: "target" as const },
    ];

    // 1. 피하기: U' (왼쪽으로 넣으므로 반대인 오른쪽으로 피함)
    doMove({ face: "U", clockwise: false }, {
      formula: formulaName,
      formulaIndex: 1,
      totalInFormula: 10,
      edgeIndex,
      secondLayerCase: layerCase,
      reason: "왼쪽으로 넣기 위해 윗면을 반대쪽(오른쪽)으로 피해요",
      situation,
      condition,
      pieceGuide,
      indicators,
    });

    // 2 ~ 5. 왼손 트위스트: L' U' L U
    const leftTwistMoves: Move[] = [
      { face: "L", clockwise: false },
      { face: "U", clockwise: false },
      { face: "L", clockwise: true },
      { face: "U", clockwise: true },
    ];
    leftTwistMoves.forEach((m, idx) => {
      doMove(m, {
        formula: formulaName,
        formulaIndex: 2 + idx,
        totalInFormula: 10,
        edgeIndex,
        secondLayerCase: layerCase,
        reason: "왼손 트위스트로 조각의 짝을 맞춰요",
        situation,
        condition,
        pieceGuide,
        indicators,
      });
    });

    // 6. 큐브 전체 회전: rotateCubeY(false)
    doRotateCube(false, {
      formula: formulaName,
      formulaIndex: 6,
      totalInFormula: 10,
      edgeIndex,
      secondLayerCase: layerCase,
      reason: "오른손 트위스트로 넣기 위해 큐브를 왼쪽으로 돌려요",
      situation,
      condition,
      pieceGuide,
      indicators,
    });

    // 7 ~ 10. 오른손 트위스트: R U R' U'
    const rightTwistMoves: Move[] = [
      { face: "R", clockwise: true },
      { face: "U", clockwise: true },
      { face: "R", clockwise: false },
      { face: "U", clockwise: false },
    ];
    rightTwistMoves.forEach((m, idx) => {
      doMove(m, {
        formula: formulaName,
        formulaIndex: 7 + idx,
        totalInFormula: 10,
        edgeIndex,
        secondLayerCase: layerCase,
        reason: "오른손 트위스트로 짝맞춘 조각을 2층 제자리에 쏙 넣어요",
        situation,
        condition,
        pieceGuide,
        indicators,
      });
    });
  }

  let totalPasses = 0;
  while (!isSecondLayerSolved(cube) && totalPasses < 12) {
    totalPasses++;

    const solvedCount = countSolvedSlots(cube);
    const edgeIndex = Math.min(4, solvedCount + 1);

    // 윗면 노란색(중앙 색)
    const yellowColor = cube[FACES.indexOf("U") * 9 + 4];

    // 1. 윗면 4개 모서리 중 노란색이 없는 조각 찾기
    let foundEdge: {
      topCol: Face;
      sideCol: Face;
    } | null = null;

    for (let i = 0; i < 4; i++) {
      const uEdge = U_EDGES[i];
      const topCol = cube[stickerIndexOf(uEdge.pos, uEdge.uNorm)!];
      const sideCol = cube[stickerIndexOf(uEdge.pos, uEdge.sideNorm)!];
      if (topCol !== yellowColor && sideCol !== yellowColor) {
        foundEdge = { topCol, sideCol };
        break;
      }
    }

    if (foundEdge) {
      // 1) sideCol 센터를 앞면(정면)으로 가져오기
      const targetFace = (["F", "R", "B", "L"] as const).find(
        (f) => cube[FACES.indexOf(f) * 9 + 4] === foundEdge!.sideCol
      )!;
      const faceOrder = ["F", "R", "B", "L"] as const;
      const rot = (faceOrder.indexOf(targetFace) - faceOrder.indexOf("F") + 4) % 4;

      for (let r = 0; r < rot; r++) {
        doRotateCube(true, {
          reason: "맞출 모서리의 옆면 색에 맞춰 큐브를 오른쪽으로 돌려요",
          situation: "모서리 조각의 옆면 색과 같은 중심 면을 정면으로 바라봐요.",
          condition: "중심 색과 일치시켜 T자를 만들기 위한 준비예요.",
          pieceGuide: { to: "정면 기준 바꾸기" },
          edgeIndex,
        });
      }

      // 2) 큐브 회전 후 그 조각이 현재 어느 위치에 있는지 찾기
      let curPos = -1;
      for (let i = 0; i < 4; i++) {
        const tC = cube[stickerIndexOf(U_EDGES[i].pos, U_EDGES[i].uNorm)!];
        const sC = cube[stickerIndexOf(U_EDGES[i].pos, U_EDGES[i].sideNorm)!];
        if (tC === foundEdge.topCol && sC === foundEdge.sideCol) {
          curPos = i;
          break;
        }
      }

      // 3) 앞쪽 위치(UF)로 가져오기 위한 윗면 회전
      if (curPos !== -1 && curPos !== 0) {
        const alignMeta = {
          reason: "윗면을 돌려 앞면 중심 색과 모서리 색으로 T자를 맞춰요",
          situation: "모서리 조각의 앞면 색이 앞면 중심 색과 일치하도록 윗면을 돌려요.",
          condition: "정면에서 완벽한 T자 모양이 만들어져야 공식을 실행할 수 있어요.",
          pieceGuide: { from: "윗면 모서리", to: "앞면 중심과 T자 정렬" },
          edgeIndex,
        };

        if (curPos === 1) {
          // UR -> UF: U
          doMove({ face: "U", clockwise: true }, alignMeta);
        } else if (curPos === 2) {
          // UB -> UF: U2
          doMove({ face: "U", clockwise: true }, alignMeta);
          doMove({ face: "U", clockwise: true }, alignMeta);
        } else if (curPos === 3) {
          // UL -> UF: U'
          doMove({ face: "U", clockwise: false }, alignMeta);
        }
      }

      // 4) 이제 UF 조각의 윗면 색을 보고 오른쪽 넣기인지 왼쪽 넣기인지 판단
      const topColNow = cube[stickerIndexOf([0, 1, 1], [0, 1, 0])!];
      const rCenter = cube[FACES.indexOf("R") * 9 + 4];
      const lCenter = cube[FACES.indexOf("L") * 9 + 4];

      if (topColNow === rCenter) {
        doRightInsert(edgeIndex);
      } else if (topColNow === lCenter) {
        doLeftInsert(edgeIndex);
      }
    } else {
      // 윗면에 노란색 없는 조각이 없음 -> 2층에 잘못 갇힌 조각을 윗면으로 꺼내야 함!
      const unsolvedSlot = SECOND_LAYER_SLOTS.find((slot) => !isSlotSolved(cube, slot));
      if (!unsolvedSlot) break;

      // 그 슬롯을 오른쪽 앞(FR) 자리에 오도록 큐브 회전
      if (unsolvedSlot.name === "FL") {
        doRotateCube(false, {
          reason: "꺼낼 조각이 오른쪽 앞에 오도록 큐브를 왼쪽으로 돌려요",
          situation: "2층에 잘못 갇힌 조각을 꺼내기 위해 기준 자리를 옮겨요.",
          condition: "공식은 항상 오른쪽 앞자리에 적용돼요.",
          pieceGuide: { to: "기준 자리로 회전" },
          edgeIndex,
        });
      } else if (unsolvedSlot.name === "BR") {
        doRotateCube(true, {
          reason: "꺼낼 조각이 오른쪽 앞에 오도록 큐브를 오른쪽으로 돌려요",
          situation: "2층에 잘못 갇힌 조각을 꺼내기 위해 기준 자리를 옮겨요.",
          condition: "공식은 항상 오른쪽 앞자리에 적용돼요.",
          pieceGuide: { to: "기준 자리로 회전" },
          edgeIndex,
        });
      } else if (unsolvedSlot.name === "BL") {
        doRotateCube(true, {
          reason: "꺼낼 조각이 오른쪽 앞에 오도록 큐브를 오른쪽으로 돌려요",
          situation: "2층에 잘못 갇힌 조각을 꺼내기 위해 기준 자리를 옮겨요.",
          condition: "공식은 항상 오른쪽 앞자리에 적용돼요.",
          pieceGuide: { to: "기준 자리로 회전" },
          edgeIndex,
        });
        doRotateCube(true, {
          reason: "꺼낼 조각이 오른쪽 앞에 오도록 큐브를 한 번 더 돌려요",
          situation: "2층에 잘못 갇힌 조각을 꺼내기 위해 기준 자리를 옮겨요.",
          condition: "공식은 항상 오른쪽 앞자리에 적용돼요.",
          pieceGuide: { to: "기준 자리로 회전" },
          edgeIndex,
        });
      }

      // 오른쪽 넣기 공식으로 2층 조각 꺼내기
      doRightInsert(edgeIndex, true);
    }
  }

  return { actions };
}
