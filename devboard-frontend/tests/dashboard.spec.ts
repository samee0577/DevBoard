import { test, expect } from "@playwright/test"

test("just dashboard", async ({ page }) => {
    await page.goto("/")
    
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible()
})