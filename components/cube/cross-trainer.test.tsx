import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { CrossTrainer } from "@/components/cube/cross-trainer";
import { COLOR_NAMES } from "@/lib/cube/appearance";

function emptyCells() {
  return screen
    .getAllByRole("button")
    .filter((button) => button.getAttribute("aria-label")?.includes("아직 안 칠함"));
}

test("한 색을 아홉 칸 넘게 칠하려 하면 열 번째 칸은 그대로 남는다", () => {
  render(<CrossTrainer />);

  // 가운데 칸이 미리 칠해져 있어 빨간색은 이미 1/9에서 시작한다.
  fireEvent.click(screen.getByRole("button", { name: /빨간색 1\/9칸/ }));

  for (let i = 0; i < 10; i += 1) {
    fireEvent.click(emptyCells()[0]);
  }

  expect(screen.getByRole("button", { name: /빨간색 9\/9칸/ })).toBeInTheDocument();
  expect(
    screen.getByText(`${COLOR_NAMES.R}은 이미 9칸을 다 칠했어요. 다른 색을 골라 주세요.`)
  ).toBeInTheDocument();
  expect(emptyCells().length).toBeGreaterThan(0);
});

test("무작위로 채우기를 누르면 곧바로 다 칠해지고 길 찾기를 누를 수 있다", () => {
  render(<CrossTrainer />);

  fireEvent.click(screen.getByRole("button", { name: "무작위로 채우기" }));

  expect(screen.getByText("모두 칠했어요")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "길 찾기" })).not.toBeDisabled();
  expect(emptyCells()).toHaveLength(0);
});
