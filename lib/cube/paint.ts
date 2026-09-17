import { type Color, FACES } from "./state";

/** 실제 큐브에서 한 색이 차지하는 칸 수. */
export const MAX_PER_COLOR = 9;

export function countPainted(
  painted: readonly (Color | null)[]
): Record<Color, number> {
  const counts = Object.fromEntries(
    FACES.map((face) => [face, 0])
  ) as Record<Color, number>;

  for (const color of painted) {
    if (color) counts[color] += 1;
  }

  return counts;
}

/** 이 칸에 이 색을 칠해도 그 색이 아홉 칸을 넘지 않는지. */
export function canPaint(
  painted: readonly (Color | null)[],
  index: number,
  color: Color
): boolean {
  if (painted[index] === color) return true;
  return countPainted(painted)[color] < MAX_PER_COLOR;
}
