import { expect, test } from "@playwright/test";

test("5단계: 노란 십자가 옆면 맞추기 안내와 8동작 공식 묶음이 브라우저에서 올바르게 표시된다", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "무작위로 채우기" }).click();
  await page.getByRole("button", { name: "큐브 맞추기 시작" }).click();

  const skipBtn = page.getByRole("button", { name: "다음 단계로 건너뛰기" });

  // 1 -> 2 -> 3 -> 4 -> 5단계로 이동
  await skipBtn.click();
  await skipBtn.click();
  await skipBtn.click();
  await skipBtn.click();

  // 5단계 헤더 및 개념 카드 확인
  await expect(page.getByText("5단계: 노란 십자가 옆면", { exact: true })).toBeVisible();
  await expect(page.getByText(/5단계: 노란 십자가 옆면 맞추기란\?/)).toBeVisible();

  // 공식 조건 / 지금 상황 / 조각 화살표 확인
  await expect(page.getByText("지금 상황")).toBeVisible();
  await expect(page.getByText("공식 조건")).toBeVisible();
  await expect(page.getByTestId("piece-indicator").first()).toBeVisible();

  // 8동작 공식 구호 칩 확인
  await expect(page.getByText("올리고").first()).toBeVisible();

  // 5단계 -> 6단계
  await skipBtn.click();
  await expect(page.getByText("6단계: 노란 꼭짓점 자리", { exact: true })).toBeVisible();

  // 6단계 -> 7단계
  await skipBtn.click();

  const isFinished = await page.getByText("🎉 축하합니다! 3x3 큐브를 모두 완성했어요!").isVisible();
  if (!isFinished) {
    await expect(page.getByText("7단계: 노란 꼭짓점 방향 (최종 완성)", { exact: true })).toBeVisible();
    await skipBtn.click();
  }
  await expect(page.getByText("🎉 축하합니다! 3x3 큐브를 모두 완성했어요!")).toBeVisible();
  await expect(skipBtn).toBeDisabled();
});
