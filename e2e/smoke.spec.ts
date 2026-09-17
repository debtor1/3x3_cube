import { expect, test } from "@playwright/test";

test("홈 화면이 열리고 시작 안내 제목과 권유 문구가 보인다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/큐브/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "내 큐브 색을 알려 주세요"
  );
  await expect(page.getByText("흰 십자가를 스스로 먼저 맞춰볼 수도 있어요")).toBeVisible();
});

test("무작위로 채우고 큐브 맞추기 시작을 누르면 3D 큐브 가이드가 열린다", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "무작위로 채우기" }).click();
  await page.getByRole("button", { name: "큐브 맞추기 시작" }).click();

  await expect(page.getByRole("button", { name: "다음 동작" })).toBeVisible();
  await expect(page.getByRole("button", { name: "처음부터 다시" })).toBeVisible();
});
