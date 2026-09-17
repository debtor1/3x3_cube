import { expect, test } from "@playwright/test";

test.describe("데스크톱(PC) 가로 2열 분할 레이아웃 (desktop-horizontal-layout)", () => {
  test("수용 기준 1 & 2: PC 데스크톱(1280px) 뷰포트에서 [좌측: 큐브] + [우측: 설명 및 버튼]이 가로 2열로 배치된다", async ({ page }) => {
    // 1280px 데스크톱 뷰포트 설정
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    // 무작위로 채우기 후 가이드 화면 진입
    await page.getByRole("button", { name: "무작위로 채우기" }).click();
    await page.getByRole("button", { name: "큐브 맞추기 시작" }).click();

    // 2열 레이아웃 컨테이너 및 열 요소 확인
    const layoutContainer = page.getByTestId("guide-layout-container");
    await expect(layoutContainer).toBeVisible();

    const cubeCol = page.getByTestId("cube-column");
    const guideCol = page.getByTestId("guide-column");

    await expect(cubeCol).toBeVisible();
    await expect(guideCol).toBeVisible();

    // 위치 좌표 측정
    const cubeBox = await cubeCol.boundingBox();
    const guideBox = await guideCol.boundingBox();

    expect(cubeBox).not.toBeNull();
    expect(guideBox).not.toBeNull();

    if (cubeBox && guideBox) {
      // 1. 좌측 큐브의 X좌표가 우측 설명의 X좌표보다 왼쪽에 위치해야 함
      expect(cubeBox.x).toBeLessThan(guideBox.x);

      // 2. 두 열이 가로로 나란히 배치되어 X 축 상에서 겹치지 않아야 함 (큐브 너비 + 마진 <= 가이드 X)
      expect(cubeBox.x + cubeBox.width).toBeLessThanOrEqual(guideBox.x + 40);

      // 3. 두 열의 시작 Y 좌표가 동일한 선상에 위치해야 함 (차이 60px 이내)
      expect(Math.abs(cubeBox.y - guideBox.y)).toBeLessThan(60);

      // 4. 우측 열 내부에 '다음 동작' 버튼이 포함되어 있어야 함
      const nextBtn = guideCol.getByRole("button", { name: "다음 동작" });
      await expect(nextBtn).toBeVisible();
    }
  });

  test("수용 기준 5: 모바일(360px) 뷰포트에서는 상하 1열 세로 스택으로 배치되고 가로 스크롤이 발생하지 않는다", async ({ page }) => {
    // 360px 모바일 뷰포트 설정
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto("/");

    // 무작위로 채우기 후 가이드 화면 진입
    await page.getByRole("button", { name: "무작위로 채우기" }).click();
    await page.getByRole("button", { name: "큐브 맞추기 시작" }).click();

    const cubeCol = page.getByTestId("cube-column");
    const guideCol = page.getByTestId("guide-column");

    await expect(cubeCol).toBeVisible();
    await expect(guideCol).toBeVisible();

    const cubeBox = await cubeCol.boundingBox();
    const guideBox = await guideCol.boundingBox();

    expect(cubeBox).not.toBeNull();
    expect(guideBox).not.toBeNull();

    if (cubeBox && guideBox) {
      // 모바일에서는 큐브 아래에 설명 영역이 세로로 배치되어야 함 (Y 좌표가 아래)
      expect(cubeBox.y).toBeLessThan(guideBox.y);
      expect(cubeBox.y + cubeBox.height).toBeLessThanOrEqual(guideBox.y + 40);
    }

    // 가로 스크롤 없음 검증
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });
});
