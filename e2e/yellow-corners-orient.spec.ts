import { expect, test } from "@playwright/test";

test("7단계: 노란 꼭짓점 방향 맞추기 및 최종 6면 전체 완성이 브라우저에서 올바르게 동작한다", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "무작위로 채우기" }).click();
  await page.getByRole("button", { name: "큐브 맞추기 시작" }).click();

  const skipBtn = page.getByRole("button", { name: "다음 단계로 건너뛰기" });

  // 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7단계로 점프
  await skipBtn.click();
  await skipBtn.click();
  await skipBtn.click();
  await skipBtn.click();
  await skipBtn.click();
  await skipBtn.click();

  // 7단계 헤더 및 개념 카드 확인 (이미 완성되었을 수 있음)
  const isFinished = await page.getByText("🎉 축하합니다! 3x3 큐브를 모두 완성했어요!").isVisible();
  if (!isFinished) {
    await expect(page.getByText("7단계: 노란 꼭짓점 방향 (최종 완성)", { exact: true })).toBeVisible();
    await expect(page.getByText(/7단계: 노란 꼭짓점 방향 맞추기 \(최종 완성!\)/)).toBeVisible();

    // 공식 조건 / 지금 상황 확인
    await expect(page.getByText("지금 상황")).toBeVisible();
    await expect(page.getByText("공식 조건")).toBeVisible();

    // 4동작 공식("아랫면 트위스트") 및 안심 안내 문구 확인
    const twistFormula = page.getByText(/아랫면 트위스트/);
    const uOnlyAlert = page.getByText(/큐브를 통째로 돌리지 마세요/);
    const isTwistOrU = (await twistFormula.count()) > 0 || (await uOnlyAlert.count()) > 0;
    expect(isTwistOrU).toBe(true);

    // 7단계 완료(최종 완성)로 건너뛰기
    await skipBtn.click();
  }

  // 큐브 6면 전체 완성 축하 화면 확인
  await expect(page.getByText("🎉 축하합니다! 3x3 큐브를 모두 완성했어요!")).toBeVisible();
  await expect(page.getByRole("button", { name: "다른 큐브 맞춰보기" })).toBeVisible();
  await expect(skipBtn).toBeDisabled();
});
