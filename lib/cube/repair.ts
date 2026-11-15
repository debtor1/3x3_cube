import { FACES, type Color, CORNER_SLOTS } from "./state";
import { validateCube } from "./validation";

export type RepairChange = {
  readonly index: number;
  readonly from: Color;
  readonly to: Color;
};

export type Repair = {
  readonly changes: readonly RepairChange[];
  /** 사진에서 이 칸들이 바뀐 색으로 보였을 가능성의 반대. 작을수록 그럴듯하다. */
  readonly cost: number;
};

/** 칸마다 여섯 색(FACES 순서) 각각까지의 색 거리. 사진으로 입력했을 때만 있다. */
export type ColorDistances = readonly (readonly number[])[];

const MAX_SUGGESTIONS = 5;
const isCenter = (index: number) => index % 9 === 4;
const EDITABLE = Array.from({ length: 54 }, (_, index) => index).filter((index) => !isCenter(index));

function costOf(changes: readonly RepairChange[], distances?: ColorDistances): number {
  if (!distances) return 0;
  return changes.reduce((sum, { index, from, to }) => {
    const row = distances[index];
    return sum + row[FACES.indexOf(to)] - row[FACES.indexOf(from)];
  }, 0);
}

function apply(facelets: readonly Color[], changes: readonly RepairChange[]): Color[] {
  const next = [...facelets];
  for (const { index, to } of changes) next[index] = to;
  return next;
}

/** 색 개수가 어긋났을 때: 남는 색 칸을 모자란 색으로 바꾸는 조합. 최대 두 칸까지만 본다. */
function recolorCandidates(facelets: readonly Color[]): RepairChange[][] {
  const counts = new Map<Color, number>(FACES.map((face) => [face, 0]));
  for (const color of facelets) counts.set(color, (counts.get(color) ?? 0) + 1);

  const missing: Color[] = [];
  for (const face of FACES) {
    for (let n = counts.get(face)!; n < 9; n++) missing.push(face);
  }
  if (missing.length === 0 || missing.length > 2) return [];

  const surplus = EDITABLE.filter((index) => counts.get(facelets[index])! > 9);
  const change = (index: number, to: Color): RepairChange => ({ index, from: facelets[index], to });

  if (missing.length === 1) {
    return surplus.map((index) => [change(index, missing[0])]);
  }

  const result: RepairChange[][] = [];
  for (let a = 0; a < surplus.length; a++) {
    for (let b = a + 1; b < surplus.length; b++) {
      const [i, j] = [surplus[a], surplus[b]];
      // 같은 색이 두 칸 남는 경우가 아니면 두 칸이 서로 다른 남는 색이어야 한다.
      result.push([change(i, missing[0]), change(j, missing[1])]);
      if (missing[0] !== missing[1]) result.push([change(i, missing[1]), change(j, missing[0])]);
    }
  }
  return result;
}

function swapCandidates(facelets: readonly Color[]): RepairChange[][] {
  const result: RepairChange[][] = [];
  for (let a = 0; a < EDITABLE.length; a++) {
    for (let b = a + 1; b < EDITABLE.length; b++) {
      const [i, j] = [EDITABLE[a], EDITABLE[b]];
      if (facelets[i] === facelets[j]) continue;
      result.push([
        { index: i, from: facelets[i], to: facelets[j] },
        { index: j, from: facelets[j], to: facelets[i] },
      ]);
    }
  }
  return result;
}

/** 꼭짓점 하나를 제자리에서 돌린 것처럼 세 칸의 색을 한 칸씩 밀어 본다. */
function cornerTurnCandidates(facelets: readonly Color[]): RepairChange[][] {
  return CORNER_SLOTS.flatMap((slot) =>
    [1, 2].map((shift) =>
      slot.map((index, k) => ({
        index,
        from: facelets[index],
        to: facelets[slot[(k + shift) % 3]],
      }))
    )
  );
}

/**
 * 실제 큐브에서 나올 수 없는 입력을 가장 적은 칸만 바꿔 바로잡는 방법을 찾는다.
 * 바꾸는 칸 수가 같은 후보가 여럿이면, 사진 색 거리가 있을 때 사진에서 그렇게 보였을
 * 가능성이 큰 순서로 늘어놓는다. 이미 실제 큐브이거나 고칠 방법을 못 찾으면 빈 목록이다.
 */
export function suggestRepairs(
  facelets: readonly Color[],
  distances?: ColorDistances
): Repair[] {
  if (facelets.length !== 54 || validateCube(facelets).valid) return [];

  const tiers = [
    () => recolorCandidates(facelets),
    () => swapCandidates(facelets),
    () => cornerTurnCandidates(facelets),
  ];

  // 바꾸는 칸 수(1, 2, 3)가 적은 후보부터 확인하고, 처음으로 답이 나온 칸 수에서 멈춘다.
  const candidates = tiers.flatMap((tier) => tier());
  const sizes = [...new Set(candidates.map((changes) => changes.length))].sort((a, b) => a - b);

  for (const size of sizes) {
    const found = candidates
      .filter((changes) => changes.length === size)
      .filter((changes) => validateCube(apply(facelets, changes)).valid)
      .map((changes) => ({ changes, cost: costOf(changes, distances) }));
    if (found.length > 0) {
      return found.sort((a, b) => a.cost - b.cost).slice(0, MAX_SUGGESTIONS);
    }
  }
  return [];
}

export function applyRepair(facelets: readonly Color[], repair: Repair): Color[] {
  return apply(facelets, repair.changes);
}
