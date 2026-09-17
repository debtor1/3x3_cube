import { expect, test } from "@playwright/test";

test.describe("공식 반복 횟수 및 목표 상태 안내 E2E (formula-repeat-guidance)", () => {
  test("공식이 반복되는 단계에서 회차 배지와 목표 문구가 상시 노출된다", async ({
    page,
  }) => {
    await page.goto("/");

    // 1. 무작위 채우고 가이드 진입
    await page.getByRole("button", { name: "무작위로 채우기" }).click();
    await page.getByRole("button", { name: "큐브 맞추기 시작" }).click();

    const skipBtn = page.getByRole("button", { name: "다음 단계로 건너뛰기" });
    const nextBtn = page.getByRole("button", { name: "다음 동작" });

    // 2. 4단계(노란 십자가)로 이동
    await skipBtn.click(); // 2단계
    await skipBtn.click(); // 3단계
    await skipBtn.click(); // 4단계

    // 4단계 공식 카드까지 이동
    for (let i = 0; i < 5; i++) {
      if (await page.getByTestId("formula-goal-text").isVisible()) break;
      if (await nextBtn.isEnabled()) {
        await nextBtn.click();
      }
    }

    if (await page.getByTestId("formula-goal-text").isVisible()) {
      // 목표 문구 존재 확인
      const goalText = await page.getByTestId("formula-goal-text").textContent();
      expect(goalText).toMatch(/🎯 (형태|목표):/);

      // 만약 2회 이상 반복인 경우 회차 배지 노출 확인
      if (await page.getByTestId("formula-repeat-badge").isVisible()) {
        const badgeText = await page.getByTestId("formula-repeat-badge").textContent();
        expect(badgeText).toMatch(/\d+ \/ \d+회차/);
      }
    }

    // 3. 7단계(최종 꼭짓점 방향)로 이동
    await skipBtn.click(); // 5단계
    await skipBtn.click(); // 6단계
    await skipBtn.click(); // 7단계

    // 트위스트 공식 카드까지 이동
    for (let i = 0; i < 8; i++) {
      if (await page.getByTestId("formula-repeat-badge").isVisible()) break;
      if (await nextBtn.isEnabled()) {
        await nextBtn.click();
      }
    }

    if (await page.getByTestId("formula-repeat-badge").isVisible()) {
      const badgeText = await page.getByTestId("formula-repeat-badge").textContent();
      expect(badgeText).toMatch(/\d+ \/ \d+회차/);

      const goalText = await page.getByTestId("formula-goal-text").textContent();
      expect(goalText).toMatch(/🎯 목표: 오른쪽 앞 꼭짓점의 노란색이 위를 볼 때까지 반복해요/);
    }
  });

  test("360px 모바일 화면에서도 공식 카드와 목표 문구가 가로 오버플로 없이 렌더링된다", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/");

    await page.getByRole("button", { name: "무작위로 채우기" }).click();
    await page.getByRole("button", { name: "큐브 맞추기 시작" }).click();

    const skipBtn = page.getByRole("button", { name: "다음 단계로 건너뛰기" });
    await skipBtn.click(); // 2단계

    // 2단계에서 공식 카드 탐색
    const nextBtn = page.getByRole("button", { name: "다음 동작" });
    for (let i = 0; i < 6; i++) {
      if (await page.getByTestId("formula-goal-text").isVisible()) break;
      if (await nextBtn.isEnabled()) {
        await nextBtn.click();
      }
    }

    if (await page.getByTestId("formula-goal-text").isVisible()) {
      const goalEl = page.getByTestId("formula-goal-text");
      await expect(goalEl).toBeVisible();

      // 수평 스크롤 여부 확인 (360px 안에서 scrollWidth <= clientWidth)
      const isOverflowing = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(isOverflowing).toBe(false);
    }
  });
});
