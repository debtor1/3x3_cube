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

    // 7단계 첫 동작이 트위스트 공식이면 공식을 보여 주기 전에 맞혀 보기 퀴즈가 먼저 뜬다.
    // 윗면 돌리기나 뒤집기로 시작하면 퀴즈 없이 바로 개념 카드가 뜨므로 두 경우를 모두 받는다.
    const quiz = page.getByText("🤔 먼저 맞혀 볼까요?");
    const concept = page.getByText(/7단계: 노란 꼭짓점 방향 맞추기 \(최종 완성!\)/);
    await expect(quiz.or(concept).first()).toBeVisible();
    if (await quiz.isVisible()) {
      await page.getByRole("button", { name: "2단계 트위스트" }).click();
      await expect(page.getByText("👏 맞았어요!")).toBeVisible();
      await page.getByRole("button", { name: "공식 보러 가기" }).click();
    }
    await expect(concept).toBeVisible();

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
