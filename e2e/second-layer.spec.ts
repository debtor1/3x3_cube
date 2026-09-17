import { expect, test } from "@playwright/test";

test("3단계: 2층 모서리 맞추기 안내와 뒤집기, 10동작 공식 묶음이 브라우저에서 동작한다", async ({ page }) => {
  await page.goto("/");

  // 무작위로 채우기 후 길 찾기
  await page.getByRole("button", { name: "무작위로 채우기" }).click();
  await page.getByRole("button", { name: "길 찾기" }).click();

  // 가이드 화면 진입 확인
  await expect(page.getByRole("button", { name: "다음 동작" })).toBeVisible();

  // 1단계 시작 안내
  await expect(page.getByText("1단계: 흰 십자가")).toBeVisible();
});
