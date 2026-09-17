import { expect, test } from "@playwright/test";

test("색 입력 화면에서 1단계를 건너뛰거나 완료 후 2단계로 진행할 수 있다", async ({ page }) => {
  await page.goto("/");

  // 시작 권유 문구 확인 (수용 기준 1)
  await expect(page.getByText("💡 흰 십자가를 스스로 먼저 맞춰볼 수도 있어요!")).toBeVisible();

  // 무작위로 채우기 후 길 찾기
  await page.getByRole("button", { name: "무작위로 채우기" }).click();
  await page.getByRole("button", { name: "길 찾기" }).click();

  // 가이드 화면 진입 확인
  await expect(page.getByRole("button", { name: "다음 동작" })).toBeVisible();

  // 다음 동작 버튼을 누르면 회전이 시작되고 회전 완료 후 이전 동작 버튼이 활성화됨
  await page.getByRole("button", { name: "다음 동작" }).click();

  // 실제 브라우저에서 회전 애니메이션이 끝나면 이전 동작 버튼이 활성화됨 (수용 기준 11)
  await expect(page.getByRole("button", { name: "이전 동작" })).toBeEnabled();
});
