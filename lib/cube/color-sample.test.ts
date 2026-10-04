import { describe, expect, it } from "vitest";
import { sampleGridFromPixels } from "./color-sample";

describe("sampleGridFromPixels", () => {
  it("격자 9칸의 색을 위→아래, 왼→오 순서로 읽는다", () => {
    // 가로 120, 세로 90 사진의 가운데 90x90 영역에 3x3 칸(30px)을 칠한다.
    const width = 120;
    const height = 90;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const gx = x - 15;
        if (gx < 0 || gx >= 90) continue;
        const cell = Math.floor(y / 30) * 3 + Math.floor(gx / 30);
        data[i] = cell * 10;
        data[i + 1] = 100;
        data[i + 2] = 200;
        data[i + 3] = 255;
      }
    }

    const samples = sampleGridFromPixels(data, width, height, { cx: 0.5, cy: 0.5, size: 1 });

    expect(samples).toEqual(
      Array.from({ length: 9 }, (_, cell) => [cell * 10, 100, 200])
    );
  });
});
