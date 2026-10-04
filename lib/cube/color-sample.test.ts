import { describe, expect, it } from "vitest";
import { detectGridRegion, sampleGridFromPixels } from "./color-sample";

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

describe("detectGridRegion", () => {
  // 회색 배경에 검은 큐브 몸체와 스티커 9개를 그린다. 왼쪽 위 칸은 테두리가 반사돼 밝게 보인다.
  function drawCube(width: number, height: number, left: number, top: number, side: number) {
    const data = new Uint8ClampedArray(width * height * 4);
    const cell = side / 3;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        let rgb = [150, 140, 130];
        const gx = x - left;
        const gy = y - top;
        if (gx >= 0 && gx < side && gy >= 0 && gy < side) {
          const col = Math.floor(gx / cell);
          const row = Math.floor(gy / cell);
          const inX = gx - col * cell;
          const inY = gy - row * cell;
          const margin = cell * 0.12;
          const isSticker = inX > margin && inX < cell - margin && inY > margin && inY < cell - margin;
          const glare = row === 0 && col === 0;
          rgb = isSticker ? [200, 230, 40] : glare ? [160, 160, 160] : [20, 20, 20];
        }
        data.set([...rgb, 255], i);
      }
    }
    return data;
  }

  it("테두리 일부가 반사돼도 스티커 배치로 큐브 면 위치를 찾는다", () => {
    const width = 400;
    const height = 520;
    const data = drawCube(width, height, 60, 180, 270);

    const region = detectGridRegion(data, width, height);

    expect(region).not.toBeNull();
    expect(region!.cx * width).toBeCloseTo(60 + 135, -1);
    expect(region!.cy * height).toBeCloseTo(180 + 135, -1);
    expect(region!.size * width).toBeCloseTo(270, -1);
  });

  it("큐브가 없는 사진에서는 null을 돌려준다", () => {
    const data = new Uint8ClampedArray(200 * 200 * 4).fill(200);
    expect(detectGridRegion(data, 200, 200)).toBeNull();
  });
});
