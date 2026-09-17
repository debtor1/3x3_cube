import { describe, expect, it } from "vitest";

import { solveWhiteCross } from "./cross";
import { solveWhiteFace } from "./face";
import { randomCube } from "./scramble";
import {
  isSecondLayerSolved,
  rotateCubeX180,
  solveSecondLayer,
} from "./second-layer";
import { applyMove, applyMoves, solvedCube, type Cube } from "./state";

describe("isSecondLayerSolved", () => {
  it("완성된 큐브는 참을 반환한다", () => {
    expect(isSecondLayerSolved(solvedCube())).toBe(true);
    expect(isSecondLayerSolved(rotateCubeX180(solvedCube()))).toBe(true);
  });

  it("1층만 맞고 2층 모서리가 틀리면 거짓을 반환한다", () => {
    // 2층 모서리 하나를 틀어놓은 상태
    const cube = applyMoves(solvedCube(), [
      { face: "U", clockwise: true },
      { face: "R", clockwise: true },
      { face: "U", clockwise: false },
      { face: "R", clockwise: false },
    ]);
    expect(isSecondLayerSolved(cube)).toBe(false);
  });
});

describe("rotateCubeX180", () => {
  it("흰 면을 바닥으로 180도 뒤집는다", () => {
    const flipped = rotateCubeX180(solvedCube());
    // D면은 모두 U(흰색) 색상이어야 함
    expect(isSecondLayerSolved(flipped)).toBe(true);
  });
});

describe("solveSecondLayer", () => {
  it("수용 기준 2: 이미 1층과 2층이 모두 맞은 상태는 빈 액션을 반환한다", () => {
    const result = solveSecondLayer(solvedCube());
    expect(result.actions).toHaveLength(0);
  });

  it("수용 기준 9: 1, 2단계를 푼 큐브에 3단계를 적용하면 1층을 깨지 않고 2층까지 완성된다", () => {
    for (let i = 0; i < 15; i++) {
      const scr = randomCube();
      const crossMoves = solveWhiteCross(scr);
      let current: Cube = applyMoves(scr, crossMoves);

      const faceResult = solveWhiteFace(current);
      for (const act of faceResult.actions) {
        if (act.type === "move") {
          current = applyMove(current, act.move);
        } else {
          current = act.apply(current);
        }
      }

      // 이제 2단계까지 끝난 상태 (흰 면과 1층 완성)
      const secondResult = solveSecondLayer(current);

      for (const act of secondResult.actions) {
        if (act.type === "move") {
          current = applyMove(current, act.move);
        } else {
          current = act.apply(current);
        }
      }

      // 1층과 2층이 모두 완성되었는가?
      expect(isSecondLayerSolved(current)).toBe(true);
    }
  });

  it("수용 기준 6, 7: 공식은 피하기 -> 트위스트 -> 큐브 회전 -> 반대손 트위스트의 10동작 묶음이다", () => {
    const scr = randomCube();
    const crossMoves = solveWhiteCross(scr);
    let current: Cube = applyMoves(scr, crossMoves);

    const faceResult = solveWhiteFace(current);
    for (const act of faceResult.actions) {
      if (act.type === "move") {
        current = applyMove(current, act.move);
      } else {
        current = act.apply(current);
      }
    }

    const { actions } = solveSecondLayer(current);

    // 공식 묶음 액션들만 필터링
    const formulaActions = actions.filter((a) => !!a.formula);
    expect(formulaActions.length % 10).toBe(0);

    for (let i = 0; i < formulaActions.length; i += 10) {
      const chunk = formulaActions.slice(i, i + 10);
      expect(chunk[0].formulaIndex).toBe(1); // 피하기
      expect(chunk[5].formulaIndex).toBe(6); // 큐브 회전
      expect(chunk[5].type).toBe("rotateCube");
      expect(chunk[9].formulaIndex).toBe(10); // 반대손 트위스트 완료
    }
  });

  it("수용 기준 10: 3단계의 어떤 안내 이유/상황에도 영문 회전 기호(R, U, F, D, L, B)가 노출되지 않는다", () => {
    const scr = randomCube();
    const crossMoves = solveWhiteCross(scr);
    let current: Cube = applyMoves(scr, crossMoves);

    const faceResult = solveWhiteFace(current);
    for (const act of faceResult.actions) {
      if (act.type === "move") {
        current = applyMove(current, act.move);
      } else {
        current = act.apply(current);
      }
    }

    const { actions } = solveSecondLayer(current);
    for (const act of actions) {
      expect(act.reason).not.toMatch(/\b[RUFDLB]\b/);
      if (act.situation) {
        expect(act.situation).not.toMatch(/\b[RUFDLB]\b/);
      }
    }
  });
});
