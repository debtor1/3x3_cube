import { describe, expect, it } from "vitest";

import { describeMove } from "./guide";
import { ALL_MOVES, applyMove, faceletsOf, solvedCube } from "./state";

describe("describeMove", () => {
  it("어떤 안내에도 영어 회전 기호가 섞이지 않는다", () => {
    for (const move of ALL_MOVES) {
      expect(describeMove(move).text).not.toMatch(/[A-Za-z]/);
    }
  });

  it("모든 수에 읽을 문장과 화살표가 함께 붙는다", () => {
    for (const move of ALL_MOVES) {
      const guide = describeMove(move);

      expect(guide.text.length).toBeGreaterThan(0);
      expect(guide.arrow.length).toBeGreaterThan(0);
    }
  });

  it("서로 다른 수는 서로 다른 문장으로 안내된다", () => {
    const sentences = ALL_MOVES.map((move) => describeMove(move).text);

    expect(new Set(sentences).size).toBe(ALL_MOVES.length);
  });

  it("오른쪽 면을 위로 돌리라는 안내는 실제로 앞면 오른쪽 줄을 위로 올린다", () => {
    const move = { face: "R", clockwise: true } as const;
    const up = faceletsOf(applyMove(solvedCube(), move), "U");

    expect(describeMove(move).text).toContain("위로");
    expect([up[2], up[5], up[8]]).toEqual(["F", "F", "F"]);
  });

  it("윗면을 왼쪽으로 돌리라는 안내는 실제로 앞면 윗줄을 왼쪽으로 보낸다", () => {
    const move = { face: "U", clockwise: true } as const;
    const left = faceletsOf(applyMove(solvedCube(), move), "L");

    expect(describeMove(move).text).toContain("왼쪽으로");
    expect(left.slice(0, 3)).toEqual(["F", "F", "F"]);
  });
});
