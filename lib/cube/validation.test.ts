import { describe, expect, it } from "vitest";

import { randomCube } from "./scramble";
import { rotateCubeX180, rotateCubeY } from "./second-layer";
import { type Color, type Vec3, applyMoves, solvedCube, stickerIndexOf } from "./state";
import { validateCube } from "./validation";

function cornerStickers(position: Vec3): [number, number, number] {
  const [x, y, z] = position;
  return [
    stickerIndexOf(position, [0, y, 0])!,
    stickerIndexOf(position, [x, 0, 0])!,
    stickerIndexOf(position, [0, 0, z])!,
  ];
}

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

  it("무작위로 섞은 큐브는 모두 실제 있을 수 있는 큐브로 본다", () => {
    for (let i = 0; i < 50; i++) {
      expect(validateCube(randomCube()).valid).toBe(true);
    }
  });

  it("큐브를 통째로 돌려 든 상태도 실제 있을 수 있는 큐브로 본다", () => {
    for (let i = 0; i < 20; i++) {
      const cube = randomCube();
      expect(validateCube(rotateCubeY(cube, true)).valid).toBe(true);
      expect(validateCube(rotateCubeX180(cube)).valid).toBe(true);
    }
  });

  it("꼭짓점 하나만 제자리에서 비틀려 있으면 걸러낸다", () => {
    const facelets = [...scrambled];
    const [a, b, c] = cornerStickers([1, 1, 1]);
    [facelets[a], facelets[b], facelets[c]] = [facelets[c], facelets[a], facelets[b]];

    const result = validateCube(facelets);

    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.issues.some((issue) => /꼭짓점/.test(issue.message))).toBe(true);
  });

  it("모서리 하나만 뒤집혀 있으면 걸러낸다", () => {
    const facelets = [...scrambled];
    const a = stickerIndexOf([0, 1, 1], [0, 1, 0])!;
    const b = stickerIndexOf([0, 1, 1], [0, 0, 1])!;
    [facelets[a], facelets[b]] = [facelets[b], facelets[a]];

    const result = validateCube(facelets);

    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.issues.some((issue) => /모서리/.test(issue.message))).toBe(true);
  });

  it("모서리 두 개만 자리가 바뀌어 있으면 걸러낸다", () => {
    const facelets = [...solvedCube()];
    // 앞-위 모서리와 오른쪽-위 모서리를 맞바꾼다. 두 조각의 윗면 칸은 둘 다 흰색이라
    // 옆면 칸만 바꾸면 조각이 통째로 자리를 바꾼 것과 같다.
    const ufSide = stickerIndexOf([0, 1, 1], [0, 0, 1])!;
    const urSide = stickerIndexOf([1, 1, 0], [1, 0, 0])!;
    [facelets[ufSide], facelets[urSide]] = [facelets[urSide], facelets[ufSide]];

    const result = validateCube(facelets);

    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.issues.some((issue) => /자리가 서로 바뀌어/.test(issue.message))).toBe(true);
  });

  it("가운데 칸 두 개만 색이 바뀌어 있으면 가운데 칸을 짚어 준다", () => {
    const facelets = [...solvedCube()];
    [facelets[4], facelets[22]] = [facelets[22], facelets[4]];

    const result = validateCube(facelets);

    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].message).toMatch(/가운데 칸/);
    expect(result.issues[0].facelets).toEqual([4, 13, 22, 31, 40, 49]);
  });

  it("가운데 칸 여섯 개가 서로 다른 색이 아니면 걸러낸다", () => {
    const facelets = [...solvedCube()];
    facelets[13] = "U";

    const result = validateCube(facelets);

    expect(result.valid).toBe(false);
  });
});
