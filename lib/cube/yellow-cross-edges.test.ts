import { describe, expect, it } from "vitest";

import { solveWhiteCross } from "./cross";
import { solveWhiteFace } from "./face";
import { randomCube } from "./scramble";
import { solveSecondLayer } from "./second-layer";
import { applyMove, applyMoves, type Cube } from "./state";
import { solveYellowCross } from "./yellow-cross";
import {
  isYellowCrossEdgesSolved,
  solveYellowCrossEdges,
} from "./yellow-cross-edges";

function getYellowCrossSolvedCube(): Cube {
  const scr = randomCube();
  let c: Cube = applyMoves(scr, solveWhiteCross(scr));
  const faceRes = solveWhiteFace(c);
  for (const act of faceRes.actions) {
    c = act.type === "move" ? applyMove(c, act.move) : act.apply(c);
  }
  const secondRes = solveSecondLayer(c);
  for (const act of secondRes.actions) {
    c = act.type === "move" ? applyMove(c, act.move) : act.apply(c);
  }
  const yellowRes = solveYellowCross(c);
  for (const act of yellowRes.actions) {
    c = act.type === "move" ? applyMove(c, act.move) : act.apply(c);
  }
  return c;
}

describe("isYellowCrossEdgesSolved", () => {
  it("4단계 완료 큐브 중 아직 옆면 색이 안 맞은 큐브는 false를 반환하고, 해결 후 true가 된다", () => {
    let cube = getYellowCrossSolvedCube();
    const { actions } = solveYellowCrossEdges(cube);

    for (const act of actions) {
      if (act.type === "move") {
        cube = applyMove(cube, act.move);
      } else {
        cube = act.apply(cube);
      }
    }

    expect(isYellowCrossEdgesSolved(cube)).toBe(true);
  });
});

describe("solveYellowCrossEdges", () => {
  it("4단계가 완성된 무작위 큐브 20개를 모두 5단계 완성으로 해결한다", () => {
    for (let testIndex = 0; testIndex < 20; testIndex++) {
      let cube = getYellowCrossSolvedCube();
      const { actions } = solveYellowCrossEdges(cube);

      for (const act of actions) {
        if (act.type === "move") {
          cube = applyMove(cube, act.move);
        } else {
          cube = act.apply(cube);
        }
      }

      expect(isYellowCrossEdgesSolved(cube)).toBe(true);
    }
  });

  it("공식 묶음은 항상 8동작 단위이며, 각 동작의 formulaIndex는 1부터 8까지 순서대로 매겨진다", () => {
    const cube = getYellowCrossSolvedCube();
    const { actions } = solveYellowCrossEdges(cube);

    const formulaActions = actions.filter((a) => !!a.formula);
    expect(formulaActions.length % 8).toBe(0);

    for (let i = 0; i < formulaActions.length; i += 8) {
      const chunk = formulaActions.slice(i, i + 8);
      for (let stepIdx = 0; stepIdx < 8; stepIdx++) {
        expect(chunk[stepIdx].formulaIndex).toBe(stepIdx + 1);
      }
    }
  });

  it("수용 기준 10: 5단계의 어떤 안내 이유/상황에도 영문 회전 기호(R, U, F, D, L, B)가 노출되지 않는다", () => {
    const cube = getYellowCrossSolvedCube();
    const { actions } = solveYellowCrossEdges(cube);

    for (const act of actions) {
      expect(act.reason).not.toMatch(/\b[RUFDLB]\b/);
      if (act.situation) {
        expect(act.situation).not.toMatch(/\b[RUFDLB]\b/);
      }
      if (act.condition) {
        expect(act.condition).not.toMatch(/\b[RUFDLB]\b/);
      }
    }
  });

  it("수용 기준 11: 5단계 공식 및 정렬 액션은 가리키는 조각 화살표 indicators와 pieceGuide를 제공한다", () => {
    const cube = getYellowCrossSolvedCube();
    const { actions } = solveYellowCrossEdges(cube);

    for (const act of actions) {
      if (act.type === "move" && act.formula) {
        expect(act.indicators).toBeDefined();
        expect(act.indicators!.length).toBeGreaterThan(0);
        expect(act.pieceGuide).toBeDefined();
        expect(act.pieceGuide!.to).toBeTruthy();
      }
    }
  });
});
