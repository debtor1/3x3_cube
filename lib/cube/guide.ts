import type { Face, Move } from "./state";

export type MoveGuide = {
  /** 아이가 읽는 한 문장. */
  readonly text: string;
  /** 문장 옆에 함께 보여 주는 방향 표시. */
  readonly arrow: string;
};

type Turn = { readonly text: string; readonly arrow: string };

// 아이가 큐브를 정면으로 들고 있다고 보고, 그 자리에서 보이는 방향으로 적는다.
const TURNS: Record<Face, { readonly clockwise: Turn; readonly counter: Turn }> = {
  R: {
    clockwise: { text: "오른쪽 면을 위로 돌려요", arrow: "↑" },
    counter: { text: "오른쪽 면을 아래로 돌려요", arrow: "↓" },
  },
  L: {
    clockwise: { text: "왼쪽 면을 아래로 돌려요", arrow: "↓" },
    counter: { text: "왼쪽 면을 위로 돌려요", arrow: "↑" },
  },
  U: {
    clockwise: { text: "윗면을 왼쪽으로 돌려요", arrow: "←" },
    counter: { text: "윗면을 오른쪽으로 돌려요", arrow: "→" },
  },
  D: {
    clockwise: { text: "아랫면을 오른쪽으로 돌려요", arrow: "→" },
    counter: { text: "아랫면을 왼쪽으로 돌려요", arrow: "←" },
  },
  F: {
    clockwise: { text: "앞면을 시계 방향으로 돌려요", arrow: "↻" },
    counter: { text: "앞면을 시계 반대 방향으로 돌려요", arrow: "↺" },
  },
  B: {
    clockwise: { text: "뒷면을 시계 반대 방향으로 돌려요", arrow: "↺" },
    counter: { text: "뒷면을 시계 방향으로 돌려요", arrow: "↻" },
  },
};

export function describeMove(move: Move): MoveGuide {
  const turn = TURNS[move.face];
  return move.clockwise ? turn.clockwise : turn.counter;
}
