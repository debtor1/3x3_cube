import { describe, expect, it } from "vitest";

import { type Color, applyMoves, solvedCube } from "./state";
import { validateCube } from "./validation";

const scrambled = applyMoves(solvedCube(), [
  { face: "R", clockwise: true },
  { face: "U", clockwise: false },
  { face: "F", clockwise: true },
  { face: "D", clockwise: true },
  { face: "L", clockwise: false },
]);

function withColorAt(index: number, color: Color) {
  const facelets = [...scrambled];
  facelets[index] = color;
  return facelets;
}

describe("validateCube", () => {
  it("다 맞춘 큐브를 실제 있을 수 있는 큐브로 본다", () => {
    expect(validateCube(solvedCube()).valid).toBe(true);
  });

  it("섞기만 한 큐브도 실제 있을 수 있는 큐브로 본다", () => {
    expect(validateCube(scrambled).valid).toBe(true);
  });

  it("한 칸을 다른 색으로 덮으면 색 개수가 어긋난 것을 알려준다", () => {
    const broken = withColorAt(0, scrambled[0] === "U" ? "D" : "U");
    const result = validateCube(broken);

    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.issues.some((issue) => /칸/.test(issue.message))).toBe(true);
  });

  it("색 개수는 맞아도 실제 큐브에 없는 모서리 짝이면 걸러낸다", () => {
    const facelets = [...solvedCube()];
    // 초록과 노랑을 맞바꾸면 색 개수는 그대로지만
    // 흰색과 노란색이 한 조각에 붙은 모서리가 생긴다.
    const greenSlot = 19;
    const yellowSlot = 28;
    facelets[greenSlot] = "D";
    facelets[yellowSlot] = "F";

    const result = validateCube(facelets);

    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.issues.flatMap((issue) => issue.facelets)).toContain(greenSlot);
  });

  it("잘못된 자리를 짚어 주어 어디를 고쳐야 할지 드러난다", () => {
    const broken = withColorAt(0, scrambled[0] === "U" ? "D" : "U");
    const result = validateCube(broken);

    expect(result.valid).toBe(false);
    if (result.valid) return;
    for (const issue of result.issues) {
      expect(issue.facelets.length).toBeGreaterThan(0);
      expect(issue.message.length).toBeGreaterThan(0);
    }
  });

  it("가운데 칸 여섯 개가 서로 다른 색이 아니면 걸러낸다", () => {
    const facelets = [...solvedCube()];
    facelets[13] = "U";

    const result = validateCube(facelets);

    expect(result.valid).toBe(false);
  });
});
