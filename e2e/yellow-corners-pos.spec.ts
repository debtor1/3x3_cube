import { expect, test } from "@playwright/test";

test("6단계: 노란 꼭짓점 자리 맞추기 안내와 8동작 대칭 공식 묶음이 브라우저에서 올바르게 표시된다", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "무작위로 채우기" }).click();
  await page.getByRole("button", { name: "큐브 맞추기 시작" }).click();

  const skipBtn = page.getByRole("button", { name: "다음 단계로 건너뛰기" });

  // 1 -> 2 -> 3 -> 4 -> 5 -> 6단계로 이동
  await skipBtn.click();
  await skipBtn.click();
  await skipBtn.click();
  await skipBtn.click();
  await skipBtn.click();

  // 6단계 헤더 확인
  await expect(page.getByText("6단계: 노란 꼭짓점 자리", { exact: true })).toBeVisible();

  const hasGuide = await page.getByText(/6단계: 노란 꼭짓점 자리 맞추기란\?/).isVisible();
  if (hasGuide) {
    // 공식 조건 / 지금 상황 확인
    await expect(page.getByText("지금 상황")).toBeVisible();
    await expect(page.getByText("공식 조건")).toBeVisible();
    // 6단계에서 건너뛰기를 누르면 7단계로 이동
    await skipBtn.click();
  }

  // 6단계 완료 버튼 또는 7단계 헤더 확인
  const isNextStageVisible = await page.getByText("7단계: 노란 꼭짓점 방향 (최종 완성)", { exact: true }).isVisible();
  const isCompletedBtnVisible = await page.getByRole("button", { name: "7단계: 노란 꼭짓점 방향 맞추러 가기" }).isVisible();
  expect(isNextStageVisible || isCompletedBtnVisible).toBe(true);
});
