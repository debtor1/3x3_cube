import { expect, test } from "@playwright/test";

test.describe("7단계 스테이지 진행 인디케이터 E2E (stage-progress-indicator)", () => {
  test("가이드 진입 시 상단에 7단계 인디케이터가 노출되고, 단계 전환 시 상태가 갱신된다", async ({
    page,
  }) => {
    await page.goto("/");

    // 1. 색 입력 화면에서는 스테이지 인디케이터가 노출되지 않음
    await expect(page.getByTestId("stage-step-1")).not.toBeVisible();

    // 2. 무작위 채우고 큐브 맞추기 시작으로 가이드 진입
    await page.getByRole("button", { name: "무작위로 채우기" }).click();
    await page.getByRole("button", { name: "큐브 맞추기 시작" }).click();

    // 3. 1~7단계 스텝이 모두 상단에 노출됨
    for (let s = 1; s <= 7; s++) {
      await expect(page.getByTestId(`stage-step-${s}`)).toBeVisible();
    }

    // 4. 1단계: step 1은 current, step 2~7은 upcoming
    await expect(page.getByTestId("stage-step-1")).toHaveAttribute("data-status", "current");
    await expect(page.getByTestId("stage-step-2")).toHaveAttribute("data-status", "upcoming");

    // 5. 건너뛰기 클릭 -> 2단계: step 1은 completed, step 2는 current
    const skipBtn = page.getByRole("button", { name: "다음 단계로 건너뛰기" });
    await skipBtn.click();
    await expect(page.getByTestId("stage-step-1")).toHaveAttribute("data-status", "completed");
    await expect(page.getByTestId("stage-step-2")).toHaveAttribute("data-status", "current");

    // 6. 계속 건너뛰어 최종 단계까지 진행
    await skipBtn.click(); // 3단계
    await expect(page.getByTestId("stage-step-3")).toHaveAttribute("data-status", "current");

    await skipBtn.click(); // 4단계
    await expect(page.getByTestId("stage-step-4")).toHaveAttribute("data-status", "current");

    await skipBtn.click(); // 5단계
    await expect(page.getByTestId("stage-step-5")).toHaveAttribute("data-status", "current");

    await skipBtn.click(); // 6단계
    await expect(page.getByTestId("stage-step-6")).toHaveAttribute("data-status", "current");

    await skipBtn.click(); // 7단계

    const isFinished = await page.getByText("🎉 축하합니다! 3x3 큐브를 모두 완성했어요!").isVisible();
    if (!isFinished) {
      await expect(page.getByTestId("stage-step-7")).toHaveAttribute("data-status", "current");
      await skipBtn.click(); // 최종 완료
    }

    // 7. 최종 완성 시 모든 1~7단계 스텝이 completed 상태임
    await expect(page.getByText("🎉 축하합니다! 3x3 큐브를 모두 완성했어요!")).toBeVisible();
    for (let s = 1; s <= 7; s++) {
      await expect(page.getByTestId(`stage-step-${s}`)).toHaveAttribute("data-status", "completed");
    }
  });
});
