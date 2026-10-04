import { describe, expect, it } from "vitest";

import { type LessonAction, STAGE_FORMULAS, STAGE_PRINCIPLES, findCaseQuiz } from "./lesson";

describe("findCaseQuiz", () => {
  it("4단계는 모양이 바뀌는 첫 동작에서만 묻는다", () => {
    const actions: LessonAction[] = [
      { stage: 4, formula: "노란 십자가 공식", yellowCrossCase: "hook" },
      { stage: 4, formula: "노란 십자가 공식", yellowCrossCase: "hook" },
      { stage: 4, formula: "노란 십자가 공식", yellowCrossCase: "line" },
    ];
    expect(findCaseQuiz(actions, 0)?.answer).toBe("hook");
    expect(findCaseQuiz(actions, 1)).toBeNull();
    expect(findCaseQuiz(actions, 2)?.answer).toBe("line");
  });

  it("3단계는 같은 경우라도 새 모서리에서 다시 묻는다", () => {
    const actions: LessonAction[] = [
      { stage: 3 },
      { stage: 3, formula: "왼쪽 넣기", edgeIndex: 1, secondLayerCase: "left" },
      { stage: 3, formula: "왼쪽 넣기", edgeIndex: 1, secondLayerCase: "left" },
      { stage: 3, formula: "왼쪽 넣기", edgeIndex: 2, secondLayerCase: "left" },
    ];
    expect(findCaseQuiz(actions, 0)).toBeNull();
    expect(findCaseQuiz(actions, 1)?.answer).toBe("left");
    expect(findCaseQuiz(actions, 2)).toBeNull();
    expect(findCaseQuiz(actions, 3)?.answer).toBe("left");
  });

  it("5·6단계는 경우가 바뀔 때 묻고, 7단계는 첫 공식에서 한 번만 묻는다", () => {
    const five: LessonAction[] = [
      { stage: 5, edgesCase: "opposite" },
      { stage: 5, edgesCase: "adjacent" },
      { stage: 5, edgesCase: "adjacent" },
    ];
    expect(findCaseQuiz(five, 0)?.answer).toBe("opposite");
    expect(findCaseQuiz(five, 1)?.answer).toBe("adjacent");
    expect(findCaseQuiz(five, 2)).toBeNull();

    const six: LessonAction[] = [{ stage: 6, posCase: "none" }, { stage: 6, posCase: "one" }];
    expect(findCaseQuiz(six, 1)?.answer).toBe("one");

    const seven: LessonAction[] = [
      { stage: 7 },
      { stage: 7, formula: "아랫면 트위스트" },
      { stage: 7, formula: "아랫면 트위스트" },
    ];
    expect(findCaseQuiz(seven, 0)).toBeNull();
    expect(findCaseQuiz(seven, 1)?.answer).toBe("twist");
    expect(findCaseQuiz(seven, 2)).toBeNull();
  });

  it("1·2단계에서는 묻지 않는다", () => {
    expect(findCaseQuiz([{ stage: 1 }], 0)).toBeNull();
    expect(findCaseQuiz([{ stage: 2, formula: "트위스트" }], 0)).toBeNull();
  });
});

describe("원리와 공식 카드 문구", () => {
  it("영어 회전 기호를 쓰지 않는다", () => {
    const texts = [
      ...Object.values(STAGE_PRINCIPLES),
      ...Object.values(STAGE_FORMULAS).flatMap((cards) =>
        cards.flatMap((c) => [c.name, c.rhythm, c.when])
      ),
    ];
    for (const text of texts) expect(text).not.toMatch(/\b[RUFDLB]'?2?\b/);
  });
});
