import { expect, test } from "@playwright/test";

test.describe("폰트 및 큐브 크기 개별 조절 E2E (view-scale-controls)", () => {
  test("화면 상단 헤더에 글자와 큐브 크기 조절 버튼이 상시 노출되고 동작한다", async ({
    page,
  }) => {
    await page.goto("/");

    // 1. 색 입력 화면에서 상단 컨트롤 바 노출 확인
    await expect(page.getByText("글자", { exact: true })).toBeVisible();
    await expect(page.getByText("큐브", { exact: true })).toBeVisible();

    const fontDown = page.getByRole("button", { name: "글자 크기 축소" });
    const fontUp = page.getByRole("button", { name: "글자 크기 확대" });
    const cubeDown = page.getByRole("button", { name: "큐브 크기 축소" });
    const cubeUp = page.getByRole("button", { name: "큐브 크기 확대" });

    await expect(fontDown).toBeVisible();
    await expect(fontUp).toBeVisible();
    await expect(cubeDown).toBeVisible();
    await expect(cubeUp).toBeVisible();

    // 2. 글자 크기 축소 (기본 1.0 -> 0.85 최소)
    await fontDown.click();
    await expect(fontDown).toBeDisabled();
    await expect(fontUp).toBeEnabled();

    // 글자 크기 확대 (0.85 -> 1.0 -> 1.15 -> 1.30 최대)
    await fontUp.click();
    await expect(fontDown).toBeEnabled();
    await fontUp.click();
    await fontUp.click();
    await expect(fontUp).toBeDisabled();

    // 3. 무작위 채우고 길 찾기로 큐브 가이드 화면 진입
    await page.getByRole("button", { name: "무작위로 채우기" }).click();
    await page.getByRole("button", { name: "큐브 맞추기 시작" }).click();

    // 가이드 화면에서도 글자 및 큐브 조절 바 유지 확인
    await expect(page.getByRole("button", { name: "글자 크기 축소" })).toBeVisible();
    await expect(page.getByRole("button", { name: "큐브 크기 확대" })).toBeVisible();

    // 4. 큐브 크기 확대 (기본 1.0 -> 1.2 최대)
    const cubeScene = page.getByTestId("cube-scene-scale");
    await expect(cubeScene).toBeVisible();
    await expect(cubeScene).toHaveAttribute("style", /scale3d\(1,\s*1,\s*1\)/);

    await cubeUp.click();
    await expect(cubeUp).toBeDisabled();
    await expect(cubeDown).toBeEnabled();
    await expect(cubeScene).toHaveAttribute("style", /scale3d\(1\.2,\s*1\.2,\s*1\.2\)/);

    // 큐브 크기 축소 (1.2 -> 1.0 -> 0.8 최소)
    await cubeDown.click();
    await expect(cubeScene).toHaveAttribute("style", /scale3d\(1,\s*1,\s*1\)/);
    await cubeDown.click();
    await expect(cubeDown).toBeDisabled();
    await expect(cubeScene).toHaveAttribute("style", /scale3d\(0\.8,\s*0\.8,\s*0\.8\)/);

    // 5. 새로고침 후에도 localStorage에 저장된 설정이 유지되는지 확인
    await page.reload();
    await expect(page.getByRole("button", { name: "큐브 크기 축소" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "글자 크기 확대" })).toBeDisabled();

    // 6. 무작위로 채우고 길 찾기 후 '처음부터 다시'를 눌러도 유지되는지 확인
    await page.getByRole("button", { name: "무작위로 채우기" }).click();
    await page.getByRole("button", { name: "큐브 맞추기 시작" }).click();
    await page.getByRole("button", { name: "처음부터 다시" }).click();
    await expect(page.getByRole("button", { name: "큐브 크기 축소" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "글자 크기 확대" })).toBeDisabled();
  });
});
