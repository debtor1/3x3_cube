import type { Color, Face } from "./state";

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

/** 아이가 화면에서 읽는 면 이름. 큐브를 정면으로 들었을 때의 자리로 부른다. */
export const FACE_LABELS: Record<Face, string> = {
  U: "윗면",
  R: "오른쪽 면",
  F: "앞면",
  D: "아랫면",
  L: "왼쪽 면",
  B: "뒷면",
};

/** 전개도에서 한 칸이 어디인지 읽어 주는 말. 예: "앞면 1번째 줄 2번째 칸". */
export function describeFacelet(face: Face, cell: number): string {
  return `${FACE_LABELS[face]} ${Math.floor(cell / 3) + 1}번째 줄 ${(cell % 3) + 1}번째 칸`;
}

export const PAINT_ORDER: readonly Color[] = ["U", "F", "R", "B", "L", "D"];

/**
 * 조각 위치를 알려 주는 표시의 색.
 * 큐브 여섯 색과 겹치면 표시인지 조각 색인지 구별되지 않으므로 겹치지 않는 색으로 둔다.
 */
export const INDICATOR_COLORS: Record<"source" | "target", string> = {
  source: "#7c3aed",
  target: "#ec4899",
};
