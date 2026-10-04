import { FACES, type Color, type Face } from "./state";

export type Rgb = readonly [number, number, number];
type Lab = readonly [number, number, number];

export type FaceSamples = Record<Face, readonly Rgb[]>;

const CENTER_INDEX = 4;
const STICKERS_PER_COLOR = 9;

function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

// sRGB → CIE Lab (D65). 사람이 느끼는 색 차이에 가깝게 거리를 재기 위해 쓴다.
export function rgbToLab([r, g, b]: Rgb): Lab {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  const x = (lr * 0.4124 + lg * 0.3576 + lb * 0.1805) / 0.95047;
  const y = lr * 0.2126 + lg * 0.7152 + lb * 0.0722;
  const z = (lr * 0.0193 + lg * 0.1192 + lb * 0.9505) / 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// 그림자나 조명 차이로 밝기는 쉽게 흔들리므로 밝기 차이는 덜 반영한다.
const LIGHTNESS_WEIGHT = 0.5;

function labDistance(a: Lab, b: Lab): number {
  const dl = (a[0] - b[0]) * LIGHTNESS_WEIGHT;
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dl * dl + da * da + db * db);
}

/**
 * 6개 면에서 뽑은 칸별 RGB 샘플을 큐브 색으로 분류합니다.
 *
 * 고정된 "표준 색" 대신 각 면 중심 칸의 실제 색을 기준으로 삼기 때문에
 * 연두빛 노랑처럼 제조사마다 다른 색이나 조명 차이에도 맞춰집니다.
 * 각 색은 정확히 9칸이어야 하므로, 가까운 쌍부터 배정하되 9칸이 찬 색은 건너뜁니다.
 */
export function classifyFaceSamples(samples: FaceSamples): Record<Face, Color[]> {
  const references = FACES.map((face) => ({
    color: face,
    lab: rgbToLab(samples[face][CENTER_INDEX]),
  }));

  const result = Object.fromEntries(
    FACES.map((face) => [face, Array<Color>(9).fill(face)])
  ) as Record<Face, Color[]>;

  const counts = Object.fromEntries(FACES.map((face) => [face, 1])) as Record<Face, number>;

  const candidates: Array<{ face: Face; index: number; color: Color; distance: number }> = [];
  for (const face of FACES) {
    samples[face].forEach((rgb, index) => {
      if (index === CENTER_INDEX) return;
      const lab = rgbToLab(rgb);
      for (const ref of references) {
        candidates.push({ face, index, color: ref.color, distance: labDistance(lab, ref.lab) });
      }
    });
  }
  candidates.sort((a, b) => a.distance - b.distance);

  const assigned = new Set<string>();
  for (const { face, index, color } of candidates) {
    const key = `${face}${index}`;
    if (assigned.has(key) || counts[color] >= STICKERS_PER_COLOR) continue;
    result[face][index] = color;
    counts[color] += 1;
    assigned.add(key);
  }

  return result;
}
