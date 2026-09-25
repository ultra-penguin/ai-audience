#!/usr/bin/env node

import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import process from "node:process";

const require = createRequire(import.meta.url);
const { chromium } = require("/Users/minjun/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");

const BASE_URL = process.argv[2]?.replace(/\/$/, "");
const SCREENSHOT_DIR = process.argv[3];
const EXECUTABLE_PATH = "/Users/minjun/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 375, height: 812 },
];
const HEADING_IDS = [
  "hero-title",
  "problem-title",
  "research-title",
  "perspective-title",
  "audience-title",
  "simulation-title",
  "timeline-title",
  "demo-title",
  "difference-title",
  "cta-title",
];

if (!BASE_URL || !SCREENSHOT_DIR) {
  console.error("Usage: node docs/qa/landing-qa.mjs <baseUrl> <screenshotDir>");
  process.exit(2);
}

await mkdir(SCREENSHOT_DIR, { recursive: true });

const results = [];
const record = (viewport, check, pass, detail = "") => {
  results.push({ viewport, check, pass, detail: String(detail).replace(/\s+/g, " ").trim() });
};

async function runCheck(viewport, check, fn) {
  try {
    const outcome = await fn();
    if (typeof outcome === "boolean") record(viewport, check, outcome);
    else record(viewport, check, Boolean(outcome?.pass), outcome?.detail ?? "");
  } catch (error) {
    record(viewport, check, false, error instanceof Error ? error.message : String(error));
  }
}

function viewportName(viewport) {
  return `${viewport.width}x${viewport.height}`;
}

function attachDiagnostics(page) {
  const diagnostics = { consoleErrors: [], pageErrors: [] };
  page.on("console", (message) => {
    if (message.type() === "error") diagnostics.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => diagnostics.pageErrors.push(error.message));
  return diagnostics;
}

async function gotoPage(page, url) {
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load").catch(() => {});
  return response;
}

async function pageDiagnostics(page, diagnostics, url) {
  const response = await gotoPage(page, url);
  return {
    status: response?.status() ?? 0,
    errors: [...diagnostics.consoleErrors, ...diagnostics.pageErrors],
  };
}

async function checkLanding(page, diagnostics, viewport) {
  const name = viewportName(viewport);
  const pageResult = await pageDiagnostics(page, diagnostics, `${BASE_URL}/`);
  record(name, "landing HTTP status", pageResult.status >= 200 && pageResult.status < 400, String(pageResult.status));
  await runCheck(name, "zero console/page errors", () => ({
    pass: pageResult.errors.length === 0,
    detail: pageResult.errors.join(" | "),
  }));

  await runCheck(name, "no horizontal overflow", async () => {
    const metrics = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
    return { pass: metrics.scrollWidth <= metrics.innerWidth, detail: `${metrics.scrollWidth} <= ${metrics.innerWidth}` };
  });

  await runCheck(name, "ten section heading ids in page order", async () => {
    const headingIds = await page.locator("h1[id], h2[id]").evaluateAll((nodes) => nodes.map((node) => node.id));
    const indexes = HEADING_IDS.map((id) => headingIds.indexOf(id));
    const pass = indexes.every((index) => index >= 0) && indexes.every((index, i) => i === 0 || index > indexes[i - 1]);
    return { pass, detail: headingIds.join(" > ") };
  });

  await runCheck(name, "hero H1 + CTA in first viewport", async () => {
    const hero = page.locator("#hero-title");
    const cta = page.getByRole("link", { name: "내 발표 테스트하기" });
    if ((await hero.count()) === 0 || (await cta.count()) === 0) return { pass: false, detail: "hero heading or CTA missing" };
    const geometry = await page.evaluate(() => {
      const h1 = document.querySelector("#hero-title")?.getBoundingClientRect();
      const link = [...document.querySelectorAll("a")].find((node) => node.textContent?.includes("내 발표 테스트하기"))?.getBoundingClientRect();
      return { h1, link, viewportHeight: window.innerHeight };
    });
    const visible = await hero.isVisible() && await cta.isVisible();
    const inViewport = geometry.h1 && geometry.link && geometry.h1.top >= 0 && geometry.h1.bottom <= geometry.viewportHeight && geometry.link.top >= 0 && geometry.link.bottom <= geometry.viewportHeight;
    return { pass: Boolean(visible && inViewport), detail: `visible=${visible} firstViewport=${Boolean(inViewport)}` };
  });

  await runCheck(name, "CTA links point to /record", async () => {
    const hrefs = await page.locator('a[href*="/record"]').evaluateAll((links) => links.map((link) => new URL(link.href).pathname));
    return { pass: hrefs.length > 0 && hrefs.every((href) => href === "/record"), detail: hrefs.join(", ") };
  });

  await runCheck(name, "visible text DEMO", async () => ({ pass: (await page.getByText("DEMO", { exact: false }).count()) > 0 }));

  await runCheck(name, "research source links present", async () => {
    const links = await page.locator('section[aria-labelledby="research-title"] a[href]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
    return { pass: links.length >= 3 && links.every((href) => /^https?:\/\//.test(href ?? "")), detail: links.join(", ") };
  });

  await runCheck(name, "PersonaSimulation tab contract", async () => {
    const tablist = page.locator('[role="tablist"]').filter({ hasText: "관중" }).first();
    if ((await tablist.count()) === 0) return { pass: false, detail: "role=tablist containing 관중 missing" };
    const tabs = tablist.getByRole("tab");
    const count = await tabs.count();
    const panel = page.getByRole("tabpanel").first();
    if (count !== 3 || (await panel.count()) === 0) return { pass: false, detail: `tabs=${count}, tabpanel=${await panel.count()}` };
    const panelTexts = new Set();
    let selectedStatePass = true;
    for (let i = 0; i < count; i += 1) {
      await tabs.nth(i).click();
      selectedStatePass = selectedStatePass && (await tabs.nth(i).getAttribute("aria-selected")) === "true";
      panelTexts.add((await panel.innerText()).trim());
    }
    await tabs.nth(0).focus();
    await tabs.nth(0).press("ArrowRight");
    const rightPass = (await tabs.nth(1).getAttribute("aria-selected")) === "true";
    await tabs.nth(1).press("ArrowLeft");
    const leftPass = (await tabs.nth(0).getAttribute("aria-selected")) === "true";
    return { pass: selectedStatePass && panelTexts.size > 1 && rightPass && leftPass, detail: `tabs=${count}, panelVariants=${panelTexts.size}, arrows=${rightPass && leftPass}` };
  });

  await runCheck(name, "AnalysisTimeline point contract", async () => {
    const points = page.locator('[data-testid="timeline-points"] button[aria-pressed]');
    const detail = page.locator('[data-testid="timeline-detail"]');
    const count = await points.count();
    if (count === 0 || (await detail.count()) === 0) return { pass: false, detail: `points=${count}, detail=${await detail.count()}` };
    let selected = 0;
    let textWithSummary = 0;
    for (let i = 0; i < count; i += 1) {
      await points.nth(i).click();
      if ((await points.nth(i).getAttribute("aria-pressed")) === "true") selected += 1;
      if ((await detail.innerText()).includes("명")) textWithSummary += 1;
    }
    return { pass: selected === count && textWithSummary === count, detail: `points=${count}, selected=${selected}, summaries=${textWithSummary}` };
  });

  await page.screenshot({ path: `${SCREENSHOT_DIR}/landing-${name}.png`, fullPage: true });
}

async function checkReducedMotion(browser, viewport) {
  const name = viewportName(viewport);
  const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
  const page = await context.newPage();
  const diagnostics = attachDiagnostics(page);
  try {
    const pageResult = await pageDiagnostics(page, diagnostics, `${BASE_URL}/`);
    record(name, "reducedMotion zero console/page errors", pageResult.errors.length === 0, pageResult.errors.join(" | "));
    await runCheck(name, "reducedMotion research metrics immediate", async () => {
      const bodyText = await page.locator("body").innerText();
      return { pass: bodyText.includes("85.4%") && bodyText.includes("95.5%"), detail: "85.4% and 95.5% present" };
    });
    await runCheck(name, "reducedMotion perspective final statement visible", async () => {
      const statement = page.getByText("우리는 평가자가 아니라, 청중을 만들었습니다.", { exact: true });
      return { pass: (await statement.count()) > 0 && await statement.isVisible(), detail: "final perspective statement" };
    });
  } finally {
    await context.close();
  }
}

async function checkRoutes(browser, viewport) {
  const name = viewportName(viewport);
  for (const path of ["/result/sample", "/record"]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const diagnostics = attachDiagnostics(page);
    try {
      const pageResult = await pageDiagnostics(page, diagnostics, `${BASE_URL}${path}`);
      record(name, `${path} loads without console/page errors`, pageResult.status >= 200 && pageResult.status < 400 && pageResult.errors.length === 0, `status=${pageResult.status}${pageResult.errors.length ? ` errors=${pageResult.errors.join(" | ")}` : ""}`);
    } catch (error) {
      record(name, `${path} loads without console/page errors`, false, error instanceof Error ? error.message : String(error));
    } finally {
      await context.close();
    }
  }
}

const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH, headless: true });
try {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const diagnostics = attachDiagnostics(page);
    try {
      await checkLanding(page, diagnostics, viewport);
    } finally {
      await context.close();
    }
    await checkReducedMotion(browser, viewport);
    await checkRoutes(browser, viewport);
  }
} finally {
  await browser.close();
}

const checks = [...new Set(results.map((result) => result.check))];
const viewports = [...new Set(results.map((result) => result.viewport))];
const cell = (result) => result ? `${result.pass ? "PASS" : "FAIL"}${result.detail ? ` (${result.detail})` : ""}` : "—";
console.log("\nLanding QA PASS/FAIL table");
console.log(`| Check | ${viewports.join(" | ")} |`);
console.log(`| --- | ${viewports.map(() => "---").join(" | ")} |`);
for (const check of checks) {
  console.log(`| ${check} | ${viewports.map((viewport) => cell(results.find((result) => result.viewport === viewport && result.check === check))).join(" | ")} |`);
}

const failures = results.filter((result) => !result.pass);
console.log(`\n${results.length - failures.length} passed, ${failures.length} failed`);
process.exitCode = failures.length > 0 ? 1 : 0;
