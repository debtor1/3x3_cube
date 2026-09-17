import {
  ALL_MOVES,
  type Cube,
  EDGE_SLOTS,
  type Face,
  type Move,
  type Vec3,
  applyMove,
  applyMoves,
  stickerAt,
} from "./state";

/** 흰 십자가를 이루는 네 모서리를 옆면 색으로 부른다. */
export const CROSS_SIDES: readonly Face[] = ["F", "R", "B", "L"];

const UP_NORMAL: Vec3 = [0, 1, 0];

const SIDE_NORMAL: Record<string, Vec3> = {
  F: [0, 0, 1],
  R: [1, 0, 0],
  B: [0, 0, -1],
  L: [-1, 0, 0],
};

const sameVec = (a: Vec3, b: Vec3) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

/** 옆면 색 하나에 대응하는 윗면 모서리 자리의 두 스티커 칸. */
function crossSlot(side: Face): { readonly up: number; readonly side: number } {
  const normal = SIDE_NORMAL[side];
  const position: Vec3 = [normal[0], 1, normal[2]];

  for (const [a, b] of EDGE_SLOTS) {
    if (!sameVec(stickerAt(a).position, position)) continue;
    return sameVec(stickerAt(a).normal, UP_NORMAL)
      ? { up: a, side: b }
      : { up: b, side: a };
  }

  throw new Error(`윗면 모서리 자리를 찾지 못했습니다: ${side}`);
}

const CROSS_SLOTS: Record<string, { readonly up: number; readonly side: number }> =
  Object.fromEntries(CROSS_SIDES.map((side) => [side, crossSlot(side)]));

function isEdgePlaced(cube: Cube, side: Face): boolean {
  const slot = CROSS_SLOTS[side];
  return cube[slot.up] === "U" && cube[slot.side] === side;
}

export function isWhiteCrossSolved(cube: Cube): boolean {
  return CROSS_SIDES.every((side) => isEdgePlaced(cube, side));
}

/** 흰색과 옆면 색으로 이루어진 조각이 지금 어느 자리에 어느 방향으로 있는지. */
function locateEdge(cube: Cube, side: Face): string {
  for (let slot = 0; slot < EDGE_SLOTS.length; slot += 1) {
    const [a, b] = EDGE_SLOTS[slot];
    const hasWhite = cube[a] === "U" || cube[b] === "U";
    const hasSide = cube[a] === side || cube[b] === side;
    if (hasWhite && hasSide) return `${slot}${cube[a] === "U" ? "u" : "s"}`;
  }

  throw new Error(`모서리 조각을 찾지 못했습니다: 흰색-${side}`);
}

const MAX_DEPTH = 8;

/**
 * 이미 제자리에 있는 조각을 지키면서 목표 조각 하나를 올리는 최단 수순을 찾는다.
 * 조각을 하나씩 올리는 순서가 아이가 기억하는 순서이므로 전체 최단해를 쓰지 않는다.
 */
function searchPlacement(cube: Cube, target: Face, keep: readonly Face[]): Move[] {
  const tracked = [target, ...keep];
  const reached = (candidate: Cube) =>
    tracked.every((side) => isEdgePlaced(candidate, side));

  if (reached(cube)) return [];

  const signature = (candidate: Cube) =>
    tracked.map((side) => locateEdge(candidate, side)).join("|");

  const visited = new Set([signature(cube)]);
  let frontier: { cube: Cube; moves: Move[] }[] = [{ cube, moves: [] }];

  for (let depth = 0; depth < MAX_DEPTH; depth += 1) {
    const next: { cube: Cube; moves: Move[] }[] = [];

    for (const node of frontier) {
      for (const move of ALL_MOVES) {
        const turned = applyMove(node.cube, move);
        const key = signature(turned);
        if (visited.has(key)) continue;
        visited.add(key);

        const moves = [...node.moves, move];
        if (reached(turned)) return moves;
        next.push({ cube: turned, moves });
      }
    }

    frontier = next;
  }

  throw new Error(`모서리 조각을 올리는 길을 찾지 못했습니다: 흰색-${target}`);
}

/** 섞인 큐브에서 옆면 색까지 맞은 흰 십자가에 이르는 수순. */
export function solveWhiteCross(cube: Cube): Move[] {
  const moves: Move[] = [];
  const placed: Face[] = [];
  let current = cube;

  for (const side of CROSS_SIDES) {
    if (!isEdgePlaced(current, side)) {
      const placement = searchPlacement(current, side, placed);
      moves.push(...placement);
      current = applyMoves(current, placement);
    }
    placed.push(side);
  }

  return moves;
}
