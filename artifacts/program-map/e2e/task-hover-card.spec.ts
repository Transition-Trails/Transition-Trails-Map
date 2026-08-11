/**
 * e2e: TaskHoverCard on the Tasks page
 *
 * Verifies that:
 *  1. The hover-card popover opens when a live task row is clicked.
 *  2. The popover renders subject, due date, and priority.
 *  3. After optimistically completing a task (checkbox click), the row shows a
 *     strikethrough / completed state and the hover-card trigger can still be
 *     clicked without throwing an error.
 *  4. The "Open in Salesforce" link renders when orgBaseUrl is present.
 *
 * Auth: this app uses Clerk — the testing agent must programmatically sign in
 * before navigating to /tasks.
 *
 * API mocking: /api/sf/tasks and /api/sf/tasks/:id/complete are mocked so the
 * test is deterministic and never calls a real Salesforce org.
 */

import { test, expect, type Page, type Route } from "@playwright/test";

// ── Fixture task data ────────────────────────────────────────────────────────

const MOCK_ORG_BASE = "https://test-org.lightning.force.com";

const MOCK_TASKS = [
  {
    Id: "00T000000000001",
    Subject: "Follow up with client after demo",
    Description: "Send the proposal doc and schedule a second call.",
    ActivityDate: new Date(Date.now() + 3 * 86_400_000)
      .toISOString()
      .slice(0, 10), // 3 days from now
    Priority: "High",
    Status: "Not Started",
    CreatedDate: new Date(Date.now() - 7 * 86_400_000).toISOString(),
  },
  {
    Id: "00T000000000002",
    Subject: "Review onboarding checklist",
    Description: null,
    ActivityDate: null,
    Priority: "Normal",
    Status: "In Progress",
    CreatedDate: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Intercept Salesforce task API calls with deterministic fixture data. */
async function mockSfTaskApis(page: Page) {
  await page.route("**/api/sf/tasks**", (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ tasks: MOCK_TASKS, orgBaseUrl: MOCK_ORG_BASE }),
    });
  });

  // PATCH complete — always succeeds
  await page.route("**/api/sf/tasks/*/complete", (route: Route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  // PATCH status — always succeeds
  await page.route("**/api/sf/tasks/*/status", (route: Route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
}

/** Open the Tasks page with mocked APIs in place. */
async function goToTasksPage(page: Page) {
  await mockSfTaskApis(page);
  await page.goto("/tasks");
  // Wait for at least one task row to appear
  await page.waitForSelector("li", { timeout: 10_000 });
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe("TaskHoverCard", () => {
  test("popover opens on a live task row and shows subject, due date, and priority", async ({
    page,
  }) => {
    await goToTasksPage(page);

    // The first task row content area (inside the TaskHoverCard trigger)
    const firstTaskContent = page
      .locator("li")
      .first()
      .locator('[class*="flex-1"]');

    // Click to open the popover
    await firstTaskContent.click();

    // The popover should now be visible
    const popover = page.locator('[data-radix-popper-content-wrapper]');
    await expect(popover).toBeVisible({ timeout: 5_000 });

    // Subject appears inside the popover
    await expect(
      popover.getByText("Follow up with client after demo")
    ).toBeVisible();

    // Due date label is shown (relative label from relativeDate())
    await expect(popover.getByText(/Due in \d+d/)).toBeVisible();

    // Priority badge
    await expect(popover.getByText("High")).toBeVisible();

    // "Open in Salesforce" link is present because orgBaseUrl was returned
    const sfLink = popover.getByRole("link", { name: /Open in Salesforce/i });
    await expect(sfLink).toBeVisible();
    await expect(sfLink).toHaveAttribute(
      "href",
      `${MOCK_ORG_BASE}/lightning/r/Task/00T000000000001/view`
    );
  });

  test("row shows strikethrough after optimistic completion", async ({
    page,
  }) => {
    await goToTasksPage(page);

    const firstRow = page.locator("li").first();

    // Locate and click the checkbox button (aria-label contains "Complete:")
    const checkbox = firstRow.getByRole("button", { name: /Complete:/i });
    await checkbox.click();

    // The subject text should now be struck through (line-through class)
    const subjectText = firstRow.locator("p.line-through");
    await expect(subjectText).toBeVisible({ timeout: 5_000 });
    await expect(subjectText).toHaveText("Follow up with client after demo");

    // The checkbox should now show the completed icon (CheckCircle2)
    //   — button becomes disabled; aria-label changes to "Completed"
    await expect(
      firstRow.getByRole("button", { name: "Completed" })
    ).toBeVisible();
  });

  test("hover-card trigger still works after the row is optimistically completed", async ({
    page,
  }) => {
    await goToTasksPage(page);

    const firstRow = page.locator("li").first();

    // Mark the task complete
    await firstRow.getByRole("button", { name: /Complete:/i }).click();
    // Wait for strikethrough to appear (optimistic update)
    await expect(firstRow.locator("p.line-through")).toBeVisible({
      timeout: 5_000,
    });

    // Now click the (still-mounted) trigger to open the popover
    const trigger = firstRow.locator('[class*="flex-1"]');
    await trigger.click();

    // Popover should still open — the trigger remains mounted after completion
    const popover = page.locator('[data-radix-popper-content-wrapper]');
    await expect(popover).toBeVisible({ timeout: 5_000 });

    // Subject is still rendered inside the popover
    await expect(
      popover.getByText("Follow up with client after demo")
    ).toBeVisible();

    // No JavaScript error dialog should be visible
    const errorDialog = page.locator('[data-replit-error-modal]');
    await expect(errorDialog).not.toBeVisible();
  });

  test("SF link is absent when orgBaseUrl is empty", async ({ page }) => {
    // Override the route to return no orgBaseUrl
    await page.route("**/api/sf/tasks**", (route: Route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ tasks: MOCK_TASKS }),
      });
    });

    await page.goto("/tasks");
    await page.waitForSelector("li", { timeout: 10_000 });

    // Open the popover
    await page.locator("li").first().locator('[class*="flex-1"]').click();
    const popover = page.locator('[data-radix-popper-content-wrapper]');
    await expect(popover).toBeVisible({ timeout: 5_000 });

    // "Open in Salesforce" link should NOT be present
    await expect(
      popover.getByRole("link", { name: /Open in Salesforce/i })
    ).not.toBeVisible();
  });
});
