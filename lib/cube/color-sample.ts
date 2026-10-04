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
export async function sampleGridFromImage(dataUrl: string, region: GridRegion): Promise<Rgb[]> {
  const { data, width, height } = await loadPixels(dataUrl);
  return sampleGridFromPixels(data, width, height, region);
}

// 큐브 몸체(검은 플라스틱)로 볼 밝기 상한. 가장 밝은 채널이 이보다 어두우면 검은 칸 테두리로 본다.
const DARK_MAX = 70;
const DETECT_STEP = 4;
const SEAL_PASSES = 2;

/**
 * 사진에서 큐브 면의 위치를 찾아 격자 위치를 돌려준다. 찾지 못하면 null.
 *
 * 가장 큰 검은 덩어리를 큐브 몸체로 보고, 그 안에 완전히 둘러싸인 밝은 구멍 9개를 스티커로 본다.
 * 스티커 9개를 감싸는 사각형을 3등분하면 각 칸 가운데가 스티커 가운데와 맞는다.
 */
export function detectGridRegion(
  data: Uint8ClampedArray,
  width: number,
  height: number
): GridRegion | null {
  const w = Math.floor(width / DETECT_STEP);
  const h = Math.floor(height / DETECT_STEP);
  const total = w * h;
  const dark = new Uint8Array(total);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * DETECT_STEP * width + x * DETECT_STEP) * 4;
      dark[y * w + x] = Math.max(data[i], data[i + 1], data[i + 2]) < DARK_MAX ? 1 : 0;
    }
  }

  // 검은 테두리의 반사광 때문에 생긴 틈을 메우려고 검은 영역을 조금 넓힌다.
  for (let pass = 0; pass < SEAL_PASSES; pass++) {
    const grown = dark.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = y * w + x;
        if (dark[c]) continue;
        if ((x > 0 && dark[c - 1]) || (x < w - 1 && dark[c + 1]) || (y > 0 && dark[c - w]) || (y < h - 1 && dark[c + w])) {
          grown[c] = 1;
        }
      }
    }
    dark.set(grown);
  }

  // 같은 종류(검은/밝은)끼리 상하좌우로 이어진 덩어리에 번호를 붙인다.
  const label = new Int32Array(total).fill(-1);
  const blobs: Array<{ dark: boolean; size: number; x0: number; x1: number; y0: number; y1: number; touchesEdge: boolean }> = [];
  for (let start = 0; start < total; start++) {
    if (label[start] >= 0) continue;
    const id = blobs.length;
    const blob = { dark: dark[start] === 1, size: 0, x0: w, x1: 0, y0: h, y1: 0, touchesEdge: false };
    const stack = [start];
    label[start] = id;
    while (stack.length > 0) {
      const c = stack.pop() as number;
      const x = c % w;
      const y = (c - x) / w;
      blob.size++;
      blob.x0 = Math.min(blob.x0, x);
      blob.x1 = Math.max(blob.x1, x);
      blob.y0 = Math.min(blob.y0, y);
      blob.y1 = Math.max(blob.y1, y);
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) blob.touchesEdge = true;
      const neighbors = [x > 0 ? c - 1 : -1, x < w - 1 ? c + 1 : -1, c - w, c + w];
      for (const n of neighbors) {
        if (n < 0 || n >= total || label[n] >= 0 || dark[n] !== dark[c]) continue;
        label[n] = id;
        stack.push(n);
      }
    }
    blobs.push(blob);
  }

  let body = -1;
  blobs.forEach((blob, id) => {
    if (blob.dark && (body < 0 || blob.size > blobs[body].size)) body = id;
  });
  if (body < 0) return null;

  // 큐브 몸체에만 맞닿아 있는 밝은 덩어리 = 스티커 후보
  const minNoise = blobs[body].size / 20;
  const enclosed = new Set<number>();
  const rejected = new Set<number>();
  for (let c = 0; c < total; c++) {
    if (dark[c]) continue;
    const id = label[c];
    if (blobs[id].touchesEdge) rejected.add(id);
    if (rejected.has(id)) continue;
    const x = c % w;
    const neighbors = [x > 0 ? c - 1 : -1, x < w - 1 ? c + 1 : -1, c - w, c + w];
    for (const n of neighbors) {
      // 스티커 안의 작은 그림자나 얼룩은 무시하고, 큐브 밖의 큰 검은 영역에 닿을 때만 제외한다.
      if (n >= 0 && n < total && dark[n] && label[n] !== body && blobs[label[n]].size > minNoise) {
        rejected.add(id);
      }
    }
    enclosed.add(id);
  }
  const found = [...enclosed]
    .filter((id) => !rejected.has(id))
    .map((id) => blobs[id])
    .filter((blob) => {
      const bw = blob.x1 - blob.x0 + 1;
      const bh = blob.y1 - blob.y0 + 1;
      return bw / bh > 0.6 && bw / bh < 1.6 && blob.size > bw * bh * 0.6;
    })
    .sort((a, b) => b.size - a.size)
    .slice(0, 9);
  if (found.length === 0) return null;
  const stickers = found.filter((blob) => blob.size >= found[0].size / 3);

  // 테두리가 반사돼 일부 스티커를 놓쳐도, 찾은 스티커들이 3줄·3열에 걸쳐 있으면 격자를 복원할 수 있다.
  const side = median(stickers.map((blob) => blob.x1 - blob.x0 + 1));
  const columns = groupPositions(stickers.map((blob) => (blob.x0 + blob.x1 + 1) / 2), side / 2);
  const rows = groupPositions(stickers.map((blob) => (blob.y0 + blob.y1 + 1) / 2), side / 2);
  if (columns.length !== 3 || rows.length !== 3) return null;

  const pitchX = (columns[2] - columns[0]) / 2;
  const pitchY = (rows[2] - rows[0]) / 2;
  const sidePx = ((pitchX + pitchY) / 2) * 3 * DETECT_STEP;
  return {
    cx: (columns[1] * DETECT_STEP) / width,
    cy: (rows[1] * DETECT_STEP) / height,
    size: Math.min(1, sidePx / Math.min(width, height)),
  };
}

/** 가까운 값끼리 묶어 각 묶음의 평균을 작은 순서로 돌려준다. */
function groupPositions(values: number[], gap: number): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const groups: number[][] = [];
  for (const v of sorted) {
    const last = groups[groups.length - 1];
    if (last && v - last[last.length - 1] <= gap) last.push(v);
    else groups.push([v]);
  }
  return groups.map((g) => g.reduce((sum, v) => sum + v, 0) / g.length);
}

function loadPixels(dataUrl: string): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
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
      resolve({ data, width: canvas.width, height: canvas.height });
    };
    img.src = dataUrl;
  });
}

/** 사진에서 큐브 면 위치를 찾고, 못 찾으면 기본 위치를 돌려준다. */
export async function detectGridRegionFromImage(dataUrl: string): Promise<GridRegion> {
  try {
    const { data, width, height } = await loadPixels(dataUrl);
    return detectGridRegion(data, width, height) ?? DEFAULT_GRID_REGION;
  } catch {
    return DEFAULT_GRID_REGION;
  }
}
