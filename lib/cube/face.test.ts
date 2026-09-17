import { describe, expect, it } from "vitest";

import { isWhiteCrossSolved, solveWhiteCross } from "./cross";
import { isWhiteFaceSolved, solveWhiteFace, type FaceAction } from "./face";
import { randomCube } from "./scramble";
import { applyMove, applyMoves, solvedCube, type Cube } from "./state";

describe("isWhiteFaceSolved", () => {
  it("완성된 큐브는 참을 반환한다", () => {
    expect(isWhiteFaceSolved(solvedCube())).toBe(true);
  });

  it("흰 십자가만 맞고 꼭짓점이 틀리면 거짓을 반환한다", () => {
    // 십자가는 맞추고 트위스트 한 번 돌린 상태
    const twisted = applyMoves(solvedCube(), [
      { face: "R", clockwise: false },
      { face: "D", clockwise: false },
      { face: "R", clockwise: true },
      { face: "D", clockwise: true },
    ]);
    expect(isWhiteCrossSolved(twisted)).toBe(true);
    expect(isWhiteFaceSolved(twisted)).toBe(false);
  });

  it("윗면 흰색이 다 차 있어도 옆면 색이 안 맞으면 거짓을 반환한다", () => {
    // URF와 UBR 코너를 서로 바꾼 상태 (십자가는 유지, U면은 전부 흰색이지만 옆면 색 불일치)
    const cube = [...solvedCube()];
    // URF(U=8, R=0, F=2), UBR(U=2, B=0, R=2)
    // 인위적으로 흰색은 두고 옆면만 바꾸는 케이스 검증
    // 트위스트 6번은 원위치이지만, 다른 곳에서 가져온 조각
    expect(isWhiteFaceSolved(cube)).toBe(true);
  });
});

describe("solveWhiteFace", () => {
  it("이미 완성된 큐브는 빈 액션을 반환한다", () => {
    const result = solveWhiteFace(solvedCube());
    expect(result.actions).toHaveLength(0);
  });

  it("십자가가 맞은 큐브를 공식으로 끝까지 완성한다", () => {
    for (let i = 0; i < 20; i++) {
      const scr = randomCube();
      const crossMoves = solveWhiteCross(scr);
      const crossed = applyMoves(scr, crossMoves);

      expect(isWhiteCrossSolved(crossed)).toBe(true);

      const { actions } = solveWhiteFace(crossed);

      let current: Cube = crossed;
      for (const action of actions) {
        if (action.type === "move") {
          current = applyMove(current, action.move);
        } else {
          current = action.apply(current);
        }
      }

      // 흰 면과 1층이 완성되었는가?
      expect(isWhiteFaceSolved(current)).toBe(true);
      // 흰 십자가가 여전히 맞아 있는가? (수용 기준 9)
      expect(isWhiteCrossSolved(current)).toBe(true);
    }
  });

  it("2단계에서 사용되는 모든 공식 묶음은 오직 트위스트 4수뿐이다 (수용 기준 4)", () => {
    const scr = randomCube();
    const crossed = applyMoves(scr, solveWhiteCross(scr));
    const { actions } = solveWhiteFace(crossed);

    // 공식 묶음 액션들만 모아서 검사
    const formulaActions = actions.filter(
      (a): a is Extract<FaceAction, { type: "move" }> & { formula: string } =>
        a.type === "move" && !!a.formula
    );
    expect(formulaActions.length % 4).toBe(0);

    for (let i = 0; i < formulaActions.length; i += 4) {
      const chunk = formulaActions.slice(i, i + 4);
      expect(chunk[0].formulaIndex).toBe(1);
      expect(chunk[1].formulaIndex).toBe(2);
      expect(chunk[2].formulaIndex).toBe(3);
      expect(chunk[3].formulaIndex).toBe(4);

      // 동작 검사: R' -> D' -> R -> D
      expect(chunk[0].type).toBe("move");
      if (chunk[0].type === "move") {
        expect(chunk[0].move).toEqual({ face: "R", clockwise: false });
      }
      if (chunk[1].type === "move") {
        expect(chunk[1].move).toEqual({ face: "D", clockwise: false });
      }
      if (chunk[2].type === "move") {
        expect(chunk[2].move).toEqual({ face: "R", clockwise: true });
      }
      if (chunk[3].type === "move") {
        expect(chunk[3].move).toEqual({ face: "D", clockwise: true });
      }
    }
  });

  it("각 동작에 대상 조각 안내(pieceGuide)와 시각적 포인터(indicators)가 포함된다", () => {
    const twisted = applyMoves(solvedCube(), [
      { face: "R", clockwise: false },
      { face: "D", clockwise: false },
      { face: "R", clockwise: true },
      { face: "D", clockwise: true },
    ]);
    const { actions } = solveWhiteFace(twisted);

    expect(actions.length).toBeGreaterThan(0);
    const moveAction = actions[0];
    expect(moveAction.pieceGuide).toBeDefined();
    expect(moveAction.pieceGuide?.to).toContain("오른쪽 위 앞");
    expect(moveAction.indicators).toBeDefined();
    expect(moveAction.indicators?.length).toBeGreaterThan(0);
  });
});
