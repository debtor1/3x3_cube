import { describe, expect, it } from "vitest";

import { isWhiteCrossSolved, solveWhiteCross } from "./cross";
import { ALL_MOVES, type Cube, type Move, applyMoves, solvedCube } from "./state";

function seededScramble(seed: number, length: number): Move[] {
  let value = seed;
  const next = () => {
    value = (value * 1103515245 + 12345) % 2147483648;
    return value / 2147483648;
  };

  return Array.from(
    { length },
    () => ALL_MOVES[Math.floor(next() * ALL_MOVES.length)]
  );
}

const scrambledCubes: Cube[] = Array.from({ length: 40 }, (_, seed) =>
  applyMoves(solvedCube(), seededScramble(seed + 1, 25))
);

describe("isWhiteCrossSolved", () => {
  it("다 맞춘 큐브는 십자가가 완성된 상태다", () => {
    expect(isWhiteCrossSolved(solvedCube())).toBe(true);
  });

  it("윗면을 한 번 돌리면 옆면 색이 어긋나 십자가가 아니다", () => {
    const turned = applyMoves(solvedCube(), [{ face: "U", clockwise: true }]);

    expect(isWhiteCrossSolved(turned)).toBe(false);
  });
});

describe("solveWhiteCross", () => {
  it("이미 십자가가 완성된 상태에서는 돌릴 것이 없다", () => {
    expect(solveWhiteCross(solvedCube())).toEqual([]);
  });

  it("섞인 큐브마다 안내대로 돌리면 옆면 색까지 맞은 십자가가 된다", () => {
    for (const cube of scrambledCubes) {
      const moves = solveWhiteCross(cube);

      expect(isWhiteCrossSolved(applyMoves(cube, moves))).toBe(true);
    }
  });

  it("안내는 90도 회전만 쓴다", () => {
    for (const cube of scrambledCubes) {
      for (const move of solveWhiteCross(cube)) {
        expect(ALL_MOVES.some((known) => known.face === move.face)).toBe(true);
        expect(typeof move.clockwise).toBe("boolean");
      }
    }
  });

  it("같은 수를 연달아 네 번 반복하는 헛수를 내지 않는다", () => {
    for (const cube of scrambledCubes) {
      const moves = solveWhiteCross(cube);

      for (let i = 3; i < moves.length; i += 1) {
        const window = moves.slice(i - 3, i + 1);
        const allSame = window.every(
          (move) =>
            move.face === window[0].face && move.clockwise === window[0].clockwise
        );
        expect(allSame).toBe(false);
      }
    }
  });
});
