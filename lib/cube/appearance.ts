import type { Color } from "./state";

/** 아이가 화면에서 읽는 색 이름. 면 이름이 아니라 실제 큐브의 색으로 부른다. */
export const COLOR_NAMES: Record<Color, string> = {
  U: "흰색",
  R: "빨간색",
  F: "초록색",
  D: "노란색",
  L: "주황색",
  B: "파란색",
};

/** 큐브 스티커에 칠하는 색. 제품 고유의 색이라 semantic token으로 대체할 수 없다. */
export const COLOR_VALUES: Record<Color, string> = {
  U: "#f1f5f9",
  R: "#dc2626",
  F: "#16a34a",
  D: "#facc15",
  L: "#f97316",
  B: "#2563eb",
};

export const PAINT_ORDER: readonly Color[] = ["U", "F", "R", "B", "L", "D"];
