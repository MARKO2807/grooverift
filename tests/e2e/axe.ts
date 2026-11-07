import { AxeBuilder } from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

/**
 * Runs axe-core with the WCAG 2.2 AA rule tags and fails on any violation.
 *
 * target-size: on the phone the tab bar is sticky at the bottom of the viewport, so whatever control happens to sit
 * under it at the current scroll position is reported as "partially obscured". The bar is part of the page flow and
 * every control can be scrolled clear of it, which is how a member reaches it. Such a node is scrolled to the centre
 * and checked again on its own; it only fails if it is still too small or too crowded there.
 */
export async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const violations = [];
  for (const v of results.violations) {
    if (v.id !== "target-size") {
      violations.push(v);
      continue;
    }
    const nodes = [];
    for (const n of v.nodes) {
      const selector = n.target.join(" ");
      const obscured = [...n.any, ...n.all, ...n.none].some(
        (c) => (c.data as { messageKey?: string } | null)?.messageKey === "partiallyObscured",
      );
      if (obscured && typeof n.target[0] === "string" && n.target.length === 1) {
        await page
          .locator(selector)
          .first()
          .evaluate((el) => el.scrollIntoView({ block: "center" }));
        const again = await new AxeBuilder({ page })
          .include(selector)
          .withRules(["target-size"])
          .analyze();
        await page.evaluate(() => window.scrollTo(0, 0));
        if (again.violations.length === 0) continue;
      }
      nodes.push(n);
    }
    if (nodes.length) violations.push({ ...v, nodes });
  }
  const summary = violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes
        .map((n) => `${n.target.join(" ")} ${n.html.slice(0, 160)}`)
        .join("\n  ")}`,
  );
  expect(summary, "axe-core violations").toEqual([]);
}
