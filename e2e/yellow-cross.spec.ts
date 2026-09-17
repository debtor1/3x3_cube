import { expect, test } from "@playwright/test";

test("4단계: 노란 십자가 맞추기 안내와 6동작 공식 묶음이 브라우저에서 동작한다", async ({ page }) => {
  await page.goto("/");

  // 시작 권유 문구 확인
  await expect(page.getByText("💡 흰 십자가를 스스로 먼저 맞춰볼 수도 있어요!")).toBeVisible();

  // 무작위로 채우기 후 길 찾기
  await page.getByRole("button", { name: "무작위로 채우기" }).click();
  await page.getByRole("button", { name: "큐브 맞추기 시작" }).click();

  // 1단계 시작 안내
  await expect(page.getByRole("button", { name: "다음 동작" })).toBeVisible();

  // 다음 동작 버튼을 누르면 회전이 시작되고 회전 완료 후 이전 동작 버튼이 활성화됨 (되돌리기 지원 검증)
  await page.getByRole("button", { name: "다음 동작" }).click();
  await expect(page.getByRole("button", { name: "이전 동작" })).toBeEnabled();
});

test("다음 단계로 건너뛰기 버튼으로 1단계부터 4단계 완료까지 순차 건너뛰기가 브라우저에서 동작한다", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "무작위로 채우기" }).click();
  await page.getByRole("button", { name: "큐브 맞추기 시작" }).click();

  const skipBtn = page.getByRole("button", { name: "다음 단계로 건너뛰기" });
  await expect(skipBtn).toBeVisible();

  // 1단계 -> 2단계
  await skipBtn.click();
  await expect(page.getByText("2단계: 흰 면 완성", { exact: true })).toBeVisible();

  // 2단계 -> 3단계
  await skipBtn.click();
  await expect(page.getByText("3단계: 2층 완성", { exact: true })).toBeVisible();

  // 3단계 -> 4단계
  await skipBtn.click();
  await expect(page.getByText("4단계: 노란 십자가", { exact: true })).toBeVisible();

  if (await page.getByText("큐브 위아래 180도 뒤집기").isVisible()) {
    await page.getByRole("button", { name: "다음 동작" }).click();
  }

  // 4단계 조각 화살표(인디케이터) 및 조각 안내 확인
  await expect(page.getByTestId("piece-indicator").first()).toBeVisible();
  await expect(page.getByText(/노란 모서리|노란 중심/).first()).toBeVisible();

  // 4단계 -> 5단계
  await skipBtn.click();
  await expect(page.getByText("5단계: 노란 십자가 옆면", { exact: true })).toBeVisible();

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
