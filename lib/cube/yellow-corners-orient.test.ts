import { expect, test } from "vitest";
import { solveWhiteCross } from "./cross";
import { solveWhiteFace } from "./face";
import { rotateCubeX180, solveSecondLayer } from "./second-layer";
import { ALL_MOVES, applyMove, type Cube, solvedCube } from "./state";
import { solveYellowCornersPos } from "./yellow-corners-pos";
import { solveYellowCross } from "./yellow-cross";
import { solveYellowCrossEdges } from "./yellow-cross-edges";
import {
  isYellowCornersOrientSolved,
  solveYellowCornersOrient,
} from "./yellow-corners-orient";

/** 실패를 그대로 재현할 수 있도록 씨앗을 주는 난수. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}


function play(cube: Cube, actions: readonly unknown[]): Cube {
  let current = cube;
  for (const raw of actions) {
    const action = raw as {
      type: string;
      move?: Parameters<typeof applyMove>[1];
      apply?: (c: Cube) => Cube;
    };
    current =
      action.type === "move" ? applyMove(current, action.move!) : action.apply!(current);
  }
  return current;
}

/** 1~6단계를 차례로 풀어, 7단계가 앱에서 실제로 받는 상태를 만든다. */
function throughStage6(scrambled: Cube): Cube {
  let c = scrambled;
  for (const move of solveWhiteCross(c)) c = applyMove(c, move);
  c = play(c, solveWhiteFace(c).actions);
  c = play(c, solveSecondLayer(c).actions);
  c = play(c, solveYellowCross(c).actions);
  c = play(c, solveYellowCrossEdges(c).actions);
  c = play(c, solveYellowCornersPos(c).actions);
  return c;
}

function scramble(random: () => number, count: number): Cube {
  let c = solvedCube();
  for (let i = 0; i < count; i++) {
    c = applyMove(c, ALL_MOVES[Math.floor(random() * ALL_MOVES.length)]);
  }
  return c;
}

test("여섯 면이 모두 중심 색과 같을 때만 큐브가 완성된 것으로 판정한다", () => {
  expect(isYellowCornersOrientSolved(solvedCube())).toBe(true);

  // 흰 면을 바닥에 두고 보아도 완성은 완성이다
  expect(isYellowCornersOrientSolved(rotateCubeX180(solvedCube()))).toBe(true);

  // 윗면만 한 번 돌아가도 옆면 색이 어긋나므로 완성이 아니다
  expect(
    isYellowCornersOrientSolved(applyMove(solvedCube(), { face: "U", clockwise: true }))
  ).toBe(false);
});

test("6단계까지 푼 큐브에 7단계를 적용하면 여섯 면이 모두 완성된다 (50회 무작위 시뮬레이션)", () => {
  const random = seededRandom(20260917);

  for (let i = 0; i < 50; i++) {
    const stage6 = throughStage6(scramble(random, 25));
    const result = solveYellowCornersOrient(stage6);
    const finished = play(stage6, result.actions);

    expect(isYellowCornersOrientSolved(finished)).toBe(true);
  }
});

test("이미 완성된 큐브는 빈 액션을 반환한다", () => {
  const result = solveYellowCornersOrient(solvedCube());
  expect(result.actions).toHaveLength(0);
});

test("7단계 액션의 안내 문구에 영문 회전 기호(R, U, D, F, L, B)가 노출되지 않는다", () => {
  const random = seededRandom(20260917);
  const stage6 = throughStage6(scramble(random, 20));
  const result = solveYellowCornersOrient(stage6);

  const englishNotationPattern = /\b[RUDFLB]['2]?\b/;
  for (const action of result.actions) {
    expect(action.reason).not.toMatch(englishNotationPattern);
    if (action.situation) expect(action.situation).not.toMatch(englishNotationPattern);
    if (action.condition) expect(action.condition).not.toMatch(englishNotationPattern);
  }
});

