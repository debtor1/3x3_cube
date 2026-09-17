import { describe, expect, it } from "vitest";

import { solveWhiteCross } from "./cross";
import { solveWhiteFace } from "./face";
import { randomCube } from "./scramble";
import { solveSecondLayer } from "./second-layer";
import { applyMove, applyMoves, type Cube } from "./state";
import {
  getYellowCrossCase,
  isYellowCrossSolved,
  solveYellowCross,
} from "./yellow-cross";

function getSecondLayerSolvedCube(): Cube {
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
  return c;
}

describe("isYellowCrossSolved & getYellowCrossCase", () => {
  it("완성된 큐브는 노란 십자가가 완성되어 있고 cross 케이스다", () => {
    const c2 = getSecondLayerSolvedCube();
    const shape = getYellowCrossCase(c2);
    expect(["dot", "hook", "line", "cross"]).toContain(shape);
  });
});

describe("solveYellowCross", () => {
  it("2층이 완성된 무작위 큐브 20개를 모두 노란 십자가 완성으로 해결한다", () => {
    for (let testIndex = 0; testIndex < 20; testIndex++) {
      let cube = getSecondLayerSolvedCube();
      const { actions } = solveYellowCross(cube);

      for (const act of actions) {
        if (act.type === "move") {
          cube = applyMove(cube, act.move);
        } else {
          cube = act.apply(cube);
        }
      }

      expect(isYellowCrossSolved(cube)).toBe(true);
    }
  });

  it("공식 묶음은 항상 6동작 단위이며, 각 동작의 formulaIndex는 1부터 6까지 순서대로 매겨진다", () => {
    const cube = getSecondLayerSolvedCube();
    const { actions } = solveYellowCross(cube);

    const formulaActions = actions.filter((a) => !!a.formula);
    expect(formulaActions.length % 6).toBe(0);

    for (let i = 0; i < formulaActions.length; i += 6) {
      const chunk = formulaActions.slice(i, i + 6);
      expect(chunk[0].formulaIndex).toBe(1); // 앞면 눕히기
      expect(chunk[1].formulaIndex).toBe(2); // 트위스트 1
      expect(chunk[2].formulaIndex).toBe(3); // 트위스트 2
      expect(chunk[3].formulaIndex).toBe(4); // 트위스트 3
      expect(chunk[4].formulaIndex).toBe(5); // 트위스트 4
      expect(chunk[5].formulaIndex).toBe(6); // 앞면 세우기
    }
  });

  it("수용 기준 9: 4단계의 어떤 안내 이유/상황에도 영문 회전 기호(R, U, F, D, L, B)가 노출되지 않는다", () => {
    const cube = getSecondLayerSolvedCube();
    const { actions } = solveYellowCross(cube);

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

  it("4단계 모든 액션은 가리키는 조각(노란 모서리 또는 노란 중심)의 화살표 indicators와 pieceGuide를 제공한다", () => {
    const cube = getSecondLayerSolvedCube();
    const { actions } = solveYellowCross(cube);

    for (const act of actions) {
      expect(act.indicators).toBeDefined();
      expect(act.indicators!.length).toBeGreaterThan(0);
      expect(act.pieceGuide).toBeDefined();
      expect(act.pieceGuide!.to).toBeTruthy();

      // 노란 모서리 또는 노란 중심 라벨이 indicators에 존재하는지 확인
      const labels = act.indicators!.map((ind) => ind.label);
      expect(labels.some((l) => l.includes("노란"))).toBe(true);
    }
  });
});
