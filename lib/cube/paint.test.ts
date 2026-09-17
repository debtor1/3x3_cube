import { describe, expect, it } from "vitest";

import { MAX_PER_COLOR, canPaint, countPainted } from "./paint";
import { type Color, FACES } from "./state";

function blank(): (Color | null)[] {
  return Array(54).fill(null);
}

describe("MAX_PER_COLOR", () => {
  it("실제 큐브에서 한 색은 아홉 칸이다", () => {
    expect(MAX_PER_COLOR).toBe(9);
  });
});

describe("countPainted", () => {
  it("아직 칠하지 않은 칸은 세지 않는다", () => {
    const counts = countPainted(blank());

    for (const face of FACES) expect(counts[face]).toBe(0);
  });

  it("칠해진 색만큼 센다", () => {
    const painted = blank();
    painted[0] = "U";
    painted[1] = "U";
    painted[2] = "R";

    const counts = countPainted(painted);

    expect(counts.U).toBe(2);
    expect(counts.R).toBe(1);
  });
});

describe("canPaint", () => {
  it("아직 아홉 칸이 안 됐으면 칠할 수 있다", () => {
    expect(canPaint(blank(), 0, "U")).toBe(true);
  });

  it("이미 아홉 칸을 채운 색은 다른 빈 칸에 더 칠할 수 없다", () => {
    const painted = blank();
    for (let i = 0; i < 9; i += 1) painted[i] = "U";

    expect(canPaint(painted, 9, "U")).toBe(false);
  });

  it("이미 그 색으로 칠해진 칸은 같은 색으로 다시 눌러도 된다", () => {
    const painted = blank();
    for (let i = 0; i < 9; i += 1) painted[i] = "U";

    expect(canPaint(painted, 0, "U")).toBe(true);
  });

  it("다른 색이 칠해진 칸을 가득 찬 색으로 덮어씌우는 것도 막는다", () => {
    const painted = blank();
    for (let i = 0; i < 9; i += 1) painted[i] = "U";
    painted[9] = "R";

    expect(canPaint(painted, 9, "U")).toBe(false);
  });

  it("아홉 칸 중 하나를 다른 색으로 바꾸면 그 자리에는 다시 칠할 수 있다", () => {
    const painted = blank();
    for (let i = 0; i < 9; i += 1) painted[i] = "U";
    painted[0] = "R";

    expect(canPaint(painted, 0, "U")).toBe(true);
  });
});
