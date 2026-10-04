import type { Rgb } from "./color-detect";

/**
 * 사진 위 3x3 격자의 위치. 중심(cx, cy)은 사진 가로·세로에 대한 비율,
 * size는 사진의 짧은 변에 대한 정사각형 한 변의 비율이다.
 */
export type GridRegion = { readonly cx: number; readonly cy: number; readonly size: number };

export const DEFAULT_GRID_REGION: GridRegion = { cx: 0.5, cy: 0.5, size: 0.8 };

// 칸 경계의 검은 테두리와 반사를 피하려고 각 칸의 가운데 부분만 읽는다.
const SAMPLE_RATIO = 0.5;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

/** RGBA 픽셀 배열에서 격자 9칸의 대표 색(채널별 중앙값)을 위→아래, 왼→오 순서로 뽑는다. */
export function sampleGridFromPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  region: GridRegion
): Rgb[] {
  const side = Math.min(width, height) * region.size;
  const left = region.cx * width - side / 2;
  const top = region.cy * height - side / 2;
  const cell = side / 3;
  const half = (cell * SAMPLE_RATIO) / 2;

  const samples: Rgb[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const centerX = left + cell * (col + 0.5);
      const centerY = top + cell * (row + 0.5);
      const rs: number[] = [];
      const gs: number[] = [];
      const bs: number[] = [];

      const x0 = Math.max(0, Math.floor(centerX - half));
      const x1 = Math.min(width - 1, Math.ceil(centerX + half));
      const y0 = Math.max(0, Math.floor(centerY - half));
      const y1 = Math.min(height - 1, Math.ceil(centerY + half));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const i = (y * width + x) * 4;
          rs.push(data[i]);
          gs.push(data[i + 1]);
          bs.push(data[i + 2]);
        }
      }
      samples.push([median(rs), median(gs), median(bs)]);
    }
  }
  return samples;
}

/** Data URL 이미지를 캔버스에 그려 격자 9칸의 색을 읽는다. */
export function sampleGridFromImage(dataUrl: string, region: GridRegion): Promise<Rgb[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("사진을 읽을 수 없습니다."));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("사진을 분석할 수 없는 브라우저입니다."));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve(sampleGridFromPixels(data, canvas.width, canvas.height, region));
    };
    img.src = dataUrl;
  });
}
