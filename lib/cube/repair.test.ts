import { describe, expect, it } from "vitest";

import { applyRepair, suggestRepairs } from "./repair";
import { randomCube } from "./scramble";
import { type Color, FACES, applyMoves, solvedCube, stickerIndexOf } from "./state";
import { validateCube } from "./validation";

const scrambled = applyMoves(solvedCube(), [
  { face: "R", clockwise: true },
  { face: "U", clockwise: false },
  { face: "F", clockwise: true },
  { face: "D", clockwise: true },
  { face: "L", clockwise: false },
]);

function changedIndices(before: readonly Color[], after: readonly Color[]): number[] {
  return before.flatMap((color, index) => (color === after[index] ? [] : [index]));
}

describe("suggestRepairs", () => {
  it("이미 실제 큐브면 고칠 것을 제안하지 않는다", () => {
    expect(suggestRepairs(scrambled)).toEqual([]);
    expect(suggestRepairs(randomCube())).toEqual([]);
  });

  it("한 칸을 잘못 읽었으면 그 한 칸만 바꾸는 방법을 제안한다", () => {
    const broken = [...scrambled];
    const index = 0;
    broken[index] = broken[index] === "R" ? "B" : "R";

    const repairs = suggestRepairs(broken);

    expect(repairs.length).toBeGreaterThan(0);
    for (const repair of repairs) {
      expect(repair.changes).toHaveLength(1);
      expect(validateCube(applyRepair(broken, repair)).valid).toBe(true);
    }
    expect(repairs.some((repair) => repair.changes[0].index === index)).toBe(true);
  });

  it("두 칸의 색이 서로 뒤바뀌었으면 두 칸 맞바꾸기를 제안한다", () => {
    const broken = [...scrambled];
    const a = stickerIndexOf([1, 1, 1], [0, 1, 0])!;
    const b = stickerIndexOf([-1, -1, -1], [0, -1, 0])!;
    expect(broken[a]).not.toBe(broken[b]);
    [broken[a], broken[b]] = [broken[b], broken[a]];
    expect(validateCube(broken).valid).toBe(false);

    const repairs = suggestRepairs(broken);

    expect(repairs.length).toBeGreaterThan(0);
    for (const repair of repairs) {
      expect(repair.changes).toHaveLength(2);
      expect(validateCube(applyRepair(broken, repair)).valid).toBe(true);
    }
  });

  it("꼭짓점 하나가 비틀렸으면 세 칸을 돌리는 방법을 제안한다", () => {
    const broken = [...scrambled];
    const slot = [
      stickerIndexOf([1, 1, 1], [0, 1, 0])!,
      stickerIndexOf([1, 1, 1], [1, 0, 0])!,
      stickerIndexOf([1, 1, 1], [0, 0, 1])!,
    ];
    [broken[slot[0]], broken[slot[1]], broken[slot[2]]] = [
      broken[slot[2]],
      broken[slot[0]],
      broken[slot[1]],
    ];

    const repairs = suggestRepairs(broken);

    expect(repairs.length).toBeGreaterThan(0);
    for (const repair of repairs) {
      expect(repair.changes).toHaveLength(3);
      expect(validateCube(applyRepair(broken, repair)).valid).toBe(true);
    }
  });

  it("사진 색 거리가 있으면 사진에서 헷갈렸을 법한 칸을 먼저 제안한다", () => {
    const broken = [...scrambled];
    const a = stickerIndexOf([1, 1, 1], [0, 1, 0])!;
    const b = stickerIndexOf([-1, -1, -1], [0, -1, 0])!;
    [broken[a], broken[b]] = [broken[b], broken[a]];

    // 대부분의 칸은 지금 색에 아주 가깝고, a와 b만 원래 색과도 가깝게 보였다고 둔다.
    const distances = broken.map((color, index) =>
      FACES.map((face) => {
        if (face === color) return 0;
        if (index === a && face === broken[b]) return 1;
        if (index === b && face === broken[a]) return 1;
        return 50;
      })
    );

    const [first] = suggestRepairs(broken, distances);

    expect(changedIndices(broken, applyRepair(broken, first)).sort((x, y) => x - y)).toEqual(
      [a, b].sort((x, y) => x - y)
    );
    expect(applyRepair(broken, first)).toEqual(scrambled);
  });
});
