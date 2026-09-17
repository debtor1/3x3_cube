import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import Home from "@/app/page";

test("첫 화면은 큐브 색을 칠하라고 안내하고, 다 칠하기 전에는 길 찾기를 막는다", () => {
  render(<Home />);

  expect(
    screen.getByRole("heading", { level: 1, name: /큐브 색을 알려 주세요/ })
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "길 찾기" })).toBeDisabled();
  expect(screen.getByText(/48칸 더 칠하면 돼요/)).toBeInTheDocument();
});

test("가운데 칸은 미리 칠해져 있어 아이가 건드리지 않는다", () => {
  render(<Home />);

  expect(
    screen.getByRole("button", { name: /앞면 2번째 줄 2번째 칸, 초록색/ })
  ).toBeDisabled();
});
