import { isWhiteCrossSolved } from "./cross";
import {
  applyMove,
  type Cube,
  FACES,
  type Face,
  type Move,
  stickerAt,
  stickerIndexOf,
  faceletsOf,
} from "./state";

export type PieceIndicator = {
  readonly position: readonly [number, number, number];
  readonly label: string;
  readonly type: "target" | "source";
};

export type PieceGuide = {
  readonly from?: string;
  readonly to: string;
};

export type FaceAction =
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
      readonly cornerIndex?: number; // 1 ~ 4
    }
  | {
      readonly type: "rotateCube";
      readonly clockwise: boolean;
      readonly reason: string;
      readonly situation?: string;
      readonly condition?: string;
      readonly pieceGuide?: PieceGuide;
      readonly indicators?: readonly PieceIndicator[];
      readonly cornerIndex?: number;
      apply(cube: Cube): Cube;
    };

const ALL_STICKERS = Array.from({ length: 54 }, (_, i) => stickerAt(i));

/** 큐브를 통째로 Y축으로 90도 돌린다. (위에서 봤을 때 clockwise) */
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

export function invertFaceAction(action: FaceAction): FaceAction {
  if (action.type === "move") {
    return {
      type: "move",
      move: { face: action.move.face, clockwise: !action.move.clockwise },
      reason: "이전 동작으로 돌아가요",
    };
  }
  return {
    type: "rotateCube",
    clockwise: !action.clockwise,
    reason: "이전 큐브 위치로 돌아가요",
    apply: (c: Cube) => rotateCubeY(c, !action.clockwise),
  };
}

export function isWhiteFaceSolved(cube: Cube): boolean {
  if (!isWhiteCrossSolved(cube)) return false;

  const uFace = faceletsOf(cube, "U");
  if (!uFace.every((c) => c === "U")) return false;

  for (const face of ["F", "R", "B", "L"] as const) {
    const facelets = faceletsOf(cube, face);
    const center = facelets[4];
    if (facelets[0] !== center || facelets[1] !== center || facelets[2] !== center) {
      return false;
    }
  }

  return true;
}

function getCornerStickers(pos: readonly [number, number, number]) {
  return ALL_STICKERS.map((s, idx) => ({ ...s, idx })).filter(
    (s) => s.position[0] === pos[0] && s.position[1] === pos[1] && s.position[2] === pos[2]
  );
}

const URF_STICKERS = getCornerStickers([1, 1, 1]);
const RDF_STICKERS = getCornerStickers([1, -1, 1]);
const RDB_STICKERS = getCornerStickers([1, -1, -1]);
const LDB_STICKERS = getCornerStickers([-1, -1, -1]);
const LDF_STICKERS = getCornerStickers([-1, -1, 1]);

const D_CORNERS = [
  { name: "RDF", stickers: RDF_STICKERS },
  { name: "RDB", stickers: RDB_STICKERS },
  { name: "LDB", stickers: LDB_STICKERS },
  { name: "LDF", stickers: LDF_STICKERS },
];

function isCornerSolvedAtURF(cube: Cube): boolean {
  const fCenter = cube[FACES.indexOf("F") * 9 + 4];
  const rCenter = cube[FACES.indexOf("R") * 9 + 4];

  const uIdx = stickerIndexOf([1, 1, 1], [0, 1, 0])!;
  const fIdx = stickerIndexOf([1, 1, 1], [0, 0, 1])!;
  const rIdx = stickerIndexOf([1, 1, 1], [1, 0, 0])!;

  return cube[uIdx] === "U" && cube[fIdx] === fCenter && cube[rIdx] === rCenter;
}

function cornerMatches(colors: Face[], targetColors: Set<Face>): boolean {
  return colors.length === 3 && colors.every((c) => targetColors.has(c));
}

const D_CORNER_INFO: Record<number, { name: string; position: readonly [number, number, number] }> = {
  0: { name: "오른쪽 앞 아래", position: [1, -1, 1] },
  1: { name: "오른쪽 뒤 아래", position: [1, -1, -1] },
  2: { name: "왼쪽 뒤 아래", position: [-1, -1, -1] },
  3: { name: "왼쪽 앞 아래", position: [-1, -1, 1] },
};

// 2단계 공식: 트위스트 4수 (R' D' R D)
const TWIST_MOVES: readonly Move[] = [
  { face: "R", clockwise: false },
  { face: "D", clockwise: false },
  { face: "R", clockwise: true },
  { face: "D", clockwise: true },
];

export function solveWhiteFace(initialCube: Cube): {
  readonly actions: readonly FaceAction[];
} {
  let cube = initialCube;
  const actions: FaceAction[] = [];

  function doMove(
    move: Move,
    meta?: {
      formula?: string;
      formulaIndex?: number;
      totalInFormula?: number;
      cornerIndex?: number;
      reason?: string;
      situation?: string;
      condition?: string;
      pieceGuide?: PieceGuide;
      indicators?: readonly PieceIndicator[];
    }
  ) {
    cube = applyMove(cube, move);
    actions.push({
      type: "move",
      move,
      reason: meta?.reason ?? "아랫면을 돌려 자리를 맞춰요",
      situation: meta?.situation,
      condition: meta?.condition,
      pieceGuide: meta?.pieceGuide,
      indicators: meta?.indicators,
      formula: meta?.formula,
      formulaIndex: meta?.formulaIndex,
      totalInFormula: meta?.totalInFormula,
      cornerIndex: meta?.cornerIndex,
    });
  }

  function doTwist(
    cornerIndex: number,
    reason: string,
    situation: string,
    condition: string,
    pieceGuide: PieceGuide,
    indicators: readonly PieceIndicator[]
  ) {
    TWIST_MOVES.forEach((m, idx) => {
      doMove(m, {
        formula: "트위스트",
        formulaIndex: idx + 1,
        totalInFormula: 4,
        cornerIndex,
        reason,
        situation,
        condition,
        pieceGuide,
        indicators,
      });
    });
  }

  function doRotateCube(
    clockwise: boolean,
    cornerIndex?: number,
    situation?: string,
    condition?: string
  ) {
    cube = rotateCubeY(cube, clockwise);
    actions.push({
      type: "rotateCube",
      clockwise,
      reason: "다음 꼭짓점을 맞추기 위해 큐브를 통째로 돌려요",
      situation: situation ?? "현재 자리의 꼭짓점이 완성되었어요!",
      condition:
        condition ??
        "아직 맞추지 않은 다음 꼭짓점을 '앞-오른쪽 위' 자리로 가져와야 해요.",
      pieceGuide: { to: "다음 꼭짓점 자리로 큐브 회전" },
      cornerIndex,
      apply: (c: Cube) => rotateCubeY(c, clockwise),
    });
  }

  let solvedCornerCount = 0;
  let totalPasses = 0;

  while (!isWhiteFaceSolved(cube) && totalPasses < 20) {
    totalPasses++;

    for (let c = 0; c < 4; c++) {
      if (isWhiteFaceSolved(cube)) break;

      const fCenter = cube[FACES.indexOf("F") * 9 + 4];
      const rCenter = cube[FACES.indexOf("R") * 9 + 4];
      const targetColors = new Set<Face>(["U", fCenter, rCenter]);
      const currentCorner = Math.min(4, solvedCornerCount + 1);

      if (isCornerSolvedAtURF(cube)) {
        solvedCornerCount = Math.min(4, solvedCornerCount + 1);
        doRotateCube(
          true,
          Math.min(4, solvedCornerCount + 1),
          "현재 꼭짓점의 흰색과 옆면 색이 모두 맞았어요!",
          "다음 맞출 꼭짓점을 '앞-오른쪽 위' 자리로 가져오기 위해 큐브를 돌려요."
        );
        continue;
      }

      // D층에서 조각 찾기
      let foundDPos = -1;
      for (let d = 0; d < 4; d++) {
        const corner = D_CORNERS[d];
        const colors = corner.stickers.map((s) => cube[s.idx]);
        if (cornerMatches(colors, targetColors)) {
          foundDPos = d;
          break;
        }
      }

      if (foundDPos !== -1) {
        // D회전으로 RDF(0번) 위치로 가져오기
        const sourceCorner = D_CORNER_INFO[foundDPos];
        const alignMeta = {
          situation: "맞춰야 할 꼭짓점 조각이 아랫면 다른 자리에 있어요.",
          condition:
            "트위스트 공식을 쓰려면 맞출 자리(앞-오른쪽 위)의 바로 아래(앞-오른쪽 아래)로 조각을 가져와야 해요.",
          reason: "아랫면을 돌려 꼭짓점 바로 아래로 가져와요",
          cornerIndex: currentCorner,
          pieceGuide: {
            from: sourceCorner.name,
            to: "오른쪽 앞 아래 (공식 시작 자리)",
          },
          indicators: [
            { position: sourceCorner.position, label: "맞출 조각", type: "source" as const },
            { position: [1, -1, 1] as const, label: "가져올 자리", type: "target" as const },
          ],
        };

        if (foundDPos === 1) {
          doMove({ face: "D", clockwise: false }, alignMeta);
        } else if (foundDPos === 2) {
          doMove({ face: "D", clockwise: true }, alignMeta);
          doMove({ face: "D", clockwise: true }, alignMeta);
        } else if (foundDPos === 3) {
          doMove({ face: "D", clockwise: true }, alignMeta);
        }

        let count = 0;
        while (!isCornerSolvedAtURF(cube) && count < 6) {
          doTwist(
            currentCorner,
            "흰 꼭짓점을 윗자리로 올려요",
            "맞출 꼭짓점 조각이 오른쪽 아래 자리에 준비되었어요.",
            "맞출 자리를 '앞-오른쪽 위'에, 들어갈 조각을 '앞-오른쪽 아래'에 둔 상태에서 공식을 실행해요.",
            { from: "오른쪽 앞 아래", to: "오른쪽 위 앞" },
            [
              { position: [1, 1, 1], label: "목표 자리", type: "target" },
              { position: [1, -1, 1], label: "맞출 조각", type: "source" },
            ]
          );
          count++;
        }
      } else {
        // D층에 없는 경우: URF에 있는지 또는 다른 U층에 있는지
        const urfColors = URF_STICKERS.map((s) => cube[s.idx]);
        if (cornerMatches(urfColors, targetColors)) {
          let count = 0;
          while (!isCornerSolvedAtURF(cube) && count < 6) {
            doTwist(
              currentCorner,
              "꼭짓점의 흰색이 위를 향하도록 돌려요",
              "조각이 제자리에 있지만, 흰색이 위가 아닌 옆을 보고 있어요.",
              "방향을 바로잡을 꼭짓점을 '앞-오른쪽 위'에 둔 상태에서 공식을 실행해요.",
              { to: "오른쪽 위 앞 (제자리 회전)" },
              [{ position: [1, 1, 1], label: "방향 맞출 조각", type: "target" }]
            );
            count++;
          }
        } else {
          doTwist(
            currentCorner,
            "잘못 들어간 조각을 아랫면으로 내려요",
            "다른 곳에 가야 할 엉뚱한 조각이 오른쪽 위 자리를 차지하고 있어요.",
            "잘못 들어간 조각을 '앞-오른쪽 위'에 둔 상태에서 공식을 1번 써서 아랫면으로 빼내요.",
            { from: "오른쪽 위 앞", to: "아랫면으로 빼내기" },
            [{ position: [1, 1, 1], label: "빼낼 조각", type: "source" }]
          );
        }
      }


      if (isCornerSolvedAtURF(cube)) {
        solvedCornerCount = Math.min(4, solvedCornerCount + 1);
      }

      doRotateCube(
        true,
        Math.min(4, solvedCornerCount + 1),
        "이 자리의 꼭짓점이 완성되었어요!",
        "다음 맞출 꼭짓점을 '앞-오른쪽 위' 자리로 가져오기 위해 큐브를 돌려요."
      );
    }
  }

  return { actions };
}
