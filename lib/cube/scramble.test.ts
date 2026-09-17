import { describe, expect, it } from "vitest";

import { randomCube } from "./scramble";
import { solvedCube } from "./state";
import { validateCube } from "./validation";

function seededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648;
    return value / 2147483648;
  };
}

describe("randomCube", () => {
  it("언제나 실제로 있을 수 있는 큐브를 만든다", () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const cube = randomCube(seededRandom(seed));

      expect(validateCube(cube).valid).toBe(true);
    }
  });

  it("쉰네 칸을 모두 채운다", () => {
    const cube = randomCube(seededRandom(1));

    expect(cube).toHaveLength(54);
    expect(cube.every((color) => color !== null && color !== undefined)).toBe(true);
  });

  it("보통은 이미 맞춰진 큐브가 아니다", () => {
    const cube = randomCube(seededRandom(7));

    expect(cube).not.toEqual(solvedCube());
  });
});
