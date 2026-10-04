import { describe, expect, it } from "vitest";
import { classifyFaceSamples, type FaceSamples, type Rgb } from "./color-detect";
import { randomCube } from "./scramble";
import { FACES, faceletsOf, type Color, type Face } from "./state";

function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// 연두빛이 도는 노랑을 쓰는 큐브를 흉내 낸다.
const LIME_YELLOW_CUBE: Record<Color, Rgb> = {
  U: [232, 232, 225],
  R: [196, 22, 36],
  F: [0, 150, 70],
  D: [185, 215, 45],
  L: [250, 115, 25],
  B: [10, 70, 175],
};

function photograph(
  facelets: Record<Face, Color[]>,
  palette: Record<Color, Rgb>,
  random: () => number
): FaceSamples {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return Object.fromEntries(
    FACES.map((face) => {
      // 사진마다 밝기가 다르고, 칸마다 약간의 잡음이 있다.
      const exposure = 0.8 + random() * 0.35;
      const samples = facelets[face].map((color) => {
        const [r, g, b] = palette[color];
        const noise = () => (random() - 0.5) * 16;
        return [
          clamp(r * exposure + noise()),
          clamp(g * exposure + noise()),
          clamp(b * exposure + noise()),
        ] as Rgb;
      });
      return [face, samples] as const;
    })
  ) as unknown as FaceSamples;
}

describe("classifyFaceSamples", () => {
  it("연두빛 노랑 큐브를 사진마다 밝기가 달라도 정확히 분류한다", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const random = seeded(seed);
      const cube = randomCube(random);
      const expected = Object.fromEntries(
        FACES.map((face) => [face, faceletsOf(cube, face)])
      ) as Record<Face, Color[]>;

      const result = classifyFaceSamples(photograph(expected, LIME_YELLOW_CUBE, random));

      expect(result).toEqual(expected);
    }
  });

  it("각 색은 항상 정확히 9칸으로 배정된다", () => {
    const random = seeded(7);
    const cube = randomCube(random);
    const facelets = Object.fromEntries(
      FACES.map((face) => [face, faceletsOf(cube, face)])
    ) as Record<Face, Color[]>;
    // 빨강과 주황을 거의 같은 색으로 만들어 애매한 상황을 만든다.
    const palette = { ...LIME_YELLOW_CUBE, L: [215, 50, 30] as Rgb };

    const result = classifyFaceSamples(photograph(facelets, palette, random));
    const counts = FACES.map(
      (color) => FACES.flatMap((face) => result[face]).filter((c) => c === color).length
    );

    expect(counts).toEqual([9, 9, 9, 9, 9, 9]);
  });
});
