import { expect, test } from "vitest";
import { rotateCubeX180 } from "./second-layer";
import { applyMove, applyMoves, solvedCube } from "./state";
import { isYellowCrossEdgesSolved, solveYellowCrossEdges } from "./yellow-cross-edges";
import {
  CORNER_SLOTS,
  getHomeCorners,
  isCornerAtHome,
  isYellowCornersPosSolved,
  solveYellowCornersPos,
} from "./yellow-corners-pos";

test("완성된 큐브에서는 4개 꼭짓점이 모두 제자리에 있다고 판정된다", () => {
  const c = rotateCubeX180(solvedCube());
  expect(isYellowCornersPosSolved(c)).toBe(true);

  for (const slot of CORNER_SLOTS) {
    expect(isCornerAtHome(c, slot)).toBe(true);
  }
  expect(getHomeCorners(c).length).toBe(4);
});

test("이미 6단계까지 완성된 큐브는 돌릴 동작 없이 빈 액션을 반환한다", () => {
  const c = rotateCubeX180(solvedCube());
  const res = solveYellowCornersPos(c);
  expect(res.actions.length).toBe(0);
});

test("Niklas 공식으로 윗면 꼭짓점이 섞인 큐브를 6단계 솔버로 풀면 1~5단계가 보존되고 4개 꼭짓점이 모두 제자리에 온다", () => {
  let c = rotateCubeX180(solvedCube());
  // Niklas 1회 적용하여 3개 꼭짓점 순환
  c = applyMoves(c, [
    { face: "U", clockwise: true },
    { face: "R", clockwise: true },
    { face: "U", clockwise: false },
    { face: "L", clockwise: false },
    { face: "U", clockwise: true },
    { face: "R", clockwise: false },
    { face: "U", clockwise: false },
    { face: "L", clockwise: true },
  ]);

  expect(isYellowCornersPosSolved(c)).toBe(false);
  expect(getHomeCorners(c).length).toBe(1);

  const res = solveYellowCornersPos(c);
  expect(res.actions.length).toBeGreaterThan(0);

  let current = c;
  for (const act of res.actions) {
    current = act.type === "move" ? applyMove(current, act.move) : act.apply(current);
  }

  expect(isYellowCornersPosSolved(current)).toBe(true);
  expect(isYellowCrossEdgesSolved(current)).toBe(true);
  expect(getHomeCorners(current).length).toBe(4);
});

test("어떤 안내 텍스트에도 영문 회전 기호(R, U, L, F, D, B)가 노출되지 않는다", () => {
  let c = rotateCubeX180(solvedCube());
  c = applyMoves(c, [
    { face: "U", clockwise: true },
    { face: "R", clockwise: true },
    { face: "U", clockwise: false },
    { face: "L", clockwise: false },
    { face: "U", clockwise: true },
    { face: "R", clockwise: false },
    { face: "U", clockwise: false },
    { face: "L", clockwise: true },
  ]);

  const res = solveYellowCornersPos(c);
  const englishMovePattern = /\b[RUFLDB]['2]?\b/;

  for (const act of res.actions) {
    expect(act.reason).not.toMatch(englishMovePattern);
    if (act.situation) expect(act.situation).not.toMatch(englishMovePattern);
    if (act.condition) expect(act.condition).not.toMatch(englishMovePattern);
  }
});

test("무작위로 섞인 50회 큐브에서 6단계 솔버가 100% 성공하며 1~5단계를 모두 보존한다", () => {
  for (let i = 0; i < 50; i++) {
    let c = rotateCubeX180(solvedCube());

    // 윗면 모서리와 꼭짓점들을 공식 조합으로 섞음
    const shuffleCount = 1 + Math.floor(Math.random() * 5);
    for (let j = 0; j < shuffleCount; j++) {
      c = applyMoves(c, [
        { face: "U", clockwise: true },
        { face: "R", clockwise: true },
        { face: "U", clockwise: false },
        { face: "L", clockwise: false },
        { face: "U", clockwise: true },
        { face: "R", clockwise: false },
        { face: "U", clockwise: false },
        { face: "L", clockwise: true },
      ]);
    }

    // 5단계가 맞춰진 상태인지 확인하고 필요시 5단계 적용
    if (!isYellowCrossEdgesSolved(c)) {
      const eRes = solveYellowCrossEdges(c);
      for (const act of eRes.actions) {
        c = act.type === "move" ? applyMove(c, act.move) : act.apply(c);
      }
    }

    const res = solveYellowCornersPos(c);
    let current = c;
    for (const act of res.actions) {
      current = act.type === "move" ? applyMove(current, act.move) : act.apply(current);
    }

    expect(isYellowCornersPosSolved(current)).toBe(true);
    expect(isYellowCrossEdgesSolved(current)).toBe(true);
  }
});
