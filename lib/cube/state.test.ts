import { describe, expect, it } from "vitest";

import {
  ALL_MOVES,
  EDGE_SLOTS,
  applyMove,
  applyMoves,
  faceletsOf,
  invertMove,
  solvedCube,
} from "./state";

describe("solvedCube", () => {
  it("여섯 면이 각각 같은 색 아홉 칸으로 채워진다", () => {
    const cube = solvedCube();

    for (const face of ["U", "R", "F", "D", "L", "B"] as const) {
      expect(faceletsOf(cube, face)).toEqual(Array(9).fill(face));
    }
  });
});

describe("applyMove", () => {
  it("같은 수를 네 번 돌리면 처음으로 돌아온다", () => {
    for (const move of ALL_MOVES) {
      const cube = solvedCube();
      const turned = applyMoves(cube, [move, move, move, move]);

      expect(turned).toEqual(cube);
    }
  });

  it("수를 돌린 뒤 반대로 돌리면 처음으로 돌아온다", () => {
    for (const move of ALL_MOVES) {
      const cube = solvedCube();
      const turned = applyMoves(cube, [move, invertMove(move)]);

      expect(turned).toEqual(cube);
    }
  });

  it("윗면을 시계 방향으로 돌리면 앞면 윗줄이 왼쪽 면으로 옮겨간다", () => {
    const turned = applyMove(solvedCube(), { face: "U", clockwise: true });

    expect(faceletsOf(turned, "L").slice(0, 3)).toEqual(["F", "F", "F"]);
    expect(faceletsOf(turned, "B").slice(0, 3)).toEqual(["L", "L", "L"]);
    expect(faceletsOf(turned, "R").slice(0, 3)).toEqual(["B", "B", "B"]);
    expect(faceletsOf(turned, "F").slice(0, 3)).toEqual(["R", "R", "R"]);
  });

  it("오른쪽 면을 시계 방향으로 돌리면 앞면 오른쪽 줄이 윗면으로 올라간다", () => {
    const turned = applyMove(solvedCube(), { face: "R", clockwise: true });
    const up = faceletsOf(turned, "U");

    expect([up[2], up[5], up[8]]).toEqual(["F", "F", "F"]);
  });

  it("면 중앙은 어떤 수에도 움직이지 않는다", () => {
    for (const move of ALL_MOVES) {
      const turned = applyMove(solvedCube(), move);

      for (const face of ["U", "R", "F", "D", "L", "B"] as const) {
        expect(faceletsOf(turned, face)[4]).toBe(face);
      }
    }
  });
});

describe("EDGE_SLOTS", () => {
  const scramble = [
    { face: "R", clockwise: true },
    { face: "U", clockwise: false },
    { face: "F", clockwise: true },
    { face: "L", clockwise: true },
    { face: "D", clockwise: false },
    { face: "B", clockwise: true },
    { face: "R", clockwise: false },
    { face: "U", clockwise: true },
  ] as const;

  it("열두 자리가 서로 다른 스티커 칸을 가리킨다", () => {
    const used = EDGE_SLOTS.flatMap((slot) => [slot[0], slot[1]]);

    expect(new Set(used).size).toBe(24);
  });

  it("어떻게 섞어도 열두 모서리 조각의 색 짝은 그대로 보존된다", () => {
    const pairsOf = (cube: ReturnType<typeof solvedCube>) =>
      EDGE_SLOTS.map(([a, b]) => [cube[a], cube[b]].sort().join("")).sort();

    const solvedPairs = pairsOf(solvedCube());
    const scrambledPairs = pairsOf(applyMoves(solvedCube(), [...scramble]));

    expect(scrambledPairs).toEqual(solvedPairs);
  });
});
