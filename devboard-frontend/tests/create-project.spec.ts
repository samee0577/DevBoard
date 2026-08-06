import { expect, test } from "@playwright/test";

test.beforeEach(async({page})=>{
    await page.goto("/");
    await page.evaluate(() => {
        localStorage.clear();
    });
    await page.reload();
});

test("create project", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Add New Project" }).click();

    await page.getByPlaceholder("Name").fill("E2E testing");
    await page.getByPlaceholder("Domain").fill("testing");
    await page.getByPlaceholder("summary").fill("This is a test project created by E2E testing");
    await page.getByPlaceholder("e.g. React").fill("jest, vitest, playwright, cypress");
    await page.getByPlaceholder("Feature Title").fill("Login");
    await page.getByPlaceholder("Enter Task").fill("This is a test feature for login functionality");

    await page.getByRole("button", { name: "Create Project" }).click();
    await page.getByRole("link", { name: "Dashboard" }).click();

    await expect(page.getByRole("heading",{name:"E2E testing"})).toBeVisible();

})
