import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StageProgress } from "./stage-progress";

describe("StageProgress (7단계 스테이지 진행 인디케이터)", () => {
  it("수용 기준 1: 1단계부터 7단계까지의 스텝이 모두 렌더링된다", () => {
    render(<StageProgress currentStage={1} />);

    for (let s = 1; s <= 7; s++) {
      expect(screen.getByTestId(`stage-step-${s}`)).toBeInTheDocument();
    }
  });

  it("수용 기준 2 & 3 & 4: 현재 단계는 current, 이전 단계는 completed, 이후 단계는 upcoming 상태이다", () => {
    // 3단계 진행 중
    render(<StageProgress currentStage={3} />);

    // 1, 2단계는 완료 (completed)
    expect(screen.getByTestId("stage-step-1")).toHaveAttribute("data-status", "completed");
    expect(screen.getByTestId("stage-step-2")).toHaveAttribute("data-status", "completed");

    // 3단계는 현재 (current)
    expect(screen.getByTestId("stage-step-3")).toHaveAttribute("data-status", "current");
    expect(screen.getByTestId("stage-step-3")).toHaveAttribute("aria-current", "step");

    // 4, 5, 6, 7단계는 예정 (upcoming)
    for (let s = 4; s <= 7; s++) {
      expect(screen.getByTestId(`stage-step-${s}`)).toHaveAttribute("data-status", "upcoming");
    }
  });

  it("수용 기준 6: 7단계가 모두 완료되면(isAllSolved) 모든 스텝이 completed 상태가 된다", () => {
    render(<StageProgress currentStage={7} isAllSolved={true} />);

    for (let s = 1; s <= 7; s++) {
      expect(screen.getByTestId(`stage-step-${s}`)).toHaveAttribute("data-status", "completed");
    }
  });

  it("수용 기준 7: 스텝은 상호작용 가능한 버튼이나 링크가 아니며 읽기 전용이다", () => {
    render(<StageProgress currentStage={4} />);

    // 스텝 요소들은 버튼 role을 갖지 않음
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
