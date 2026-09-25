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
  const diagnostics = { consoleErrors: [], hydrationErrors: [], pageErrors: [] };
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error") diagnostics.consoleErrors.push(text);
    if (/hydration|server html|client html|hydrated/i.test(text)) diagnostics.hydrationErrors.push(text);
  });
  page.on("pageerror", (error) => diagnostics.pageErrors.push(error.message));
  return diagnostics;
}

async function installInstrumentation(context) {
  await context.addInitScript(() => {
    const state = { longTasks: [], layoutShifts: [], longTaskSupported: false, layoutShiftSupported: false };
    globalThis.__landingPerf = state;
    if (typeof PerformanceObserver === "undefined") return;
    const supported = PerformanceObserver.supportedEntryTypes ?? [];
    if (supported.includes("longtask")) {
      state.longTaskSupported = true;
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) state.longTasks.push(entry.duration);
        }).observe({ type: "longtask", buffered: true });
      } catch {
        state.longTaskSupported = false;
      }
    }
    if (supported.includes("layout-shift")) {
      state.layoutShiftSupported = true;
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) state.layoutShifts.push(entry.value);
          }
        }).observe({ type: "layout-shift", buffered: true });
      } catch {
        state.layoutShiftSupported = false;
      }
    }
  });
}

async function gotoPage(page, url) {
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load").catch(() => {});
  await page.waitForTimeout(100);
  return response;
}

async function pageDiagnostics(page, diagnostics, url) {
  const response = await gotoPage(page, url);
  const performance = await page.evaluate(() => globalThis.__landingPerf ?? null).catch(() => null);
  return {
    status: response?.status() ?? 0,
    errors: [...diagnostics.consoleErrors, ...diagnostics.hydrationErrors, ...diagnostics.pageErrors],
    performance,
  };
}

async function performanceChecks(page, pageResult, viewport) {
  const name = viewportName(viewport);
  await runCheck(name, "load long tasks <= 200ms", () => {
    const durations = pageResult.performance?.longTasks ?? [];
    const supported = pageResult.performance?.longTaskSupported;
    return {
      pass: !supported || durations.every((duration) => duration <= 200),
      detail: supported ? (durations.length ? `max=${Math.max(...durations).toFixed(1)}ms` : "none observed") : "PerformanceObserver longtask unavailable",
    };
  });
  await runCheck(name, "load CLS <= 0.1", () => {
    const shifts = pageResult.performance?.layoutShifts ?? [];
    const supported = pageResult.performance?.layoutShiftSupported;
    const cls = shifts.reduce((sum, value) => sum + value, 0);
    return {
      pass: !supported || cls <= 0.1,
      detail: supported ? `CLS=${cls.toFixed(3)}` : "PerformanceObserver layout-shift unavailable",
    };
  });
  await runCheck(name, "animations use transform/opacity only", async () => {
    const result = await page.evaluate(() => {
      const bad = [];
      const animationTargets = new Map();
      for (const node of document.querySelectorAll("*")) {
        const names = getComputedStyle(node).animationName.split(",").map((name) => name.trim()).filter((name) => name && name !== "none");
        for (const name of names) {
          const targets = animationTargets.get(name) ?? [];
          targets.push(node);
          animationTargets.set(name, targets);
        }
      }
      const visit = (rules) => {
        for (const rule of rules) {
          if (rule.type === CSSRule.KEYFRAMES_RULE) {
            for (const keyframe of rule.cssRules) {
              for (const property of keyframe.style) {
                const exceptionTargets = animationTargets.get(rule.name) ?? [];
                const isApprovedSvgPathException = property === "stroke-dashoffset" && exceptionTargets.length > 0 && exceptionTargets.every((target) => target.tagName.toLowerCase() === "path" && target.namespaceURI === "http://www.w3.org/2000/svg");
                if (!["transform", "opacity"].includes(property) && !property.startsWith("--tw-") && !isApprovedSvgPathException) {
                  bad.push(`${rule.name}:${property}`);
                }
              }
            }
          } else if (rule.cssRules) {
            visit(rule.cssRules);
          }
        }
      };
      for (const sheet of document.styleSheets) {
        try {
          if (sheet.cssRules) visit(sheet.cssRules);
        } catch {
          // Ignore cross-origin stylesheets; the app's local stylesheet remains inspectable.
        }
      }
      return [...new Set(bad)];
    });
    return { pass: result.length === 0, detail: result.length ? result.join(", ") : "transform/opacity only; approved SVG path stroke-dashoffset exception" };
  });
}

async function accessibilityChecks(page, viewport) {
  const name = viewportName(viewport);
  await runCheck(name, "one h1", async () => ({ pass: await page.locator("h1").count() === 1, detail: `count=${await page.locator("h1").count()}` }));
  await runCheck(name, "main landmark", async () => ({ pass: await page.locator("main").count() === 1, detail: `count=${await page.locator("main").count()}` }));
  await runCheck(name, "images and SVGs labeled or hidden", async () => {
    const result = await page.evaluate(() => [...document.querySelectorAll("img, svg")].map((node) => ({
      tag: node.tagName.toLowerCase(),
      label: node.getAttribute("aria-label") || node.getAttribute("aria-labelledby") || node.getAttribute("alt"),
      hidden: node.getAttribute("aria-hidden") === "true",
    })).filter((node) => !node.hidden && !node.label));
    return { pass: result.length === 0, detail: result.length ? result.map((node) => node.tag).join(", ") : "all labeled or aria-hidden" };
  });
  await page.keyboard.press("Tab").catch(() => {});
  await runCheck(name, "focus visible on tabs/buttons", async () => {
    const result = await page.evaluate(() => {
      const targets = [...document.querySelectorAll("button, [role=tab]")];
      const misses = targets.filter((node) => {
        node.focus();
        const style = getComputedStyle(node);
        return !node.matches(":focus-visible") || (style.outlineStyle === "none" && style.boxShadow === "none");
      });
      return { count: targets.length, misses: misses.map((node) => node.textContent?.trim().slice(0, 30) || node.tagName) };
    });
    return { pass: result.count > 0 && result.misses.length === 0, detail: `targets=${result.count}${result.misses.length ? ` misses=${result.misses.join(", ")}` : ""}` };
  });
  await runCheck(name, "color is not the sole state signal", async () => {
    const result = await page.evaluate(() => [...document.querySelectorAll("[role=tab][aria-selected], button[aria-pressed]")].map((node) => ({
      text: node.textContent?.trim(),
      state: node.getAttribute("aria-selected") ?? node.getAttribute("aria-pressed"),
    })));
    return { pass: result.length > 0 && result.every((item) => item.text && item.state !== null), detail: `semantic states=${result.length}` };
  });
}

async function checkLanding(page, diagnostics, viewport) {
  const name = viewportName(viewport);
  const pageResult = await pageDiagnostics(page, diagnostics, `${BASE_URL}/`);
  record(name, "landing HTTP status", pageResult.status >= 200 && pageResult.status < 400, String(pageResult.status));
  await runCheck(name, "zero console/page errors", () => ({
    pass: pageResult.errors.length === 0,
    detail: pageResult.errors.join(" | "),
  }));
  await performanceChecks(page, pageResult, viewport);

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

  await accessibilityChecks(page, viewport);
  await page.evaluate(() => {
    const bottom = Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0);
    window.scrollTo(0, bottom);
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(3100);
  await runCheck(name, "document height budget", async () => {
    const height = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0));
    const budget = viewport.width === 1920 ? 8600 : null;
    return { pass: budget === null || height <= budget, detail: `${height}px${budget ? ` <= ${budget}px` : ""}` };
  });
  await page.screenshot({ path: `${SCREENSHOT_DIR}/landing-${name}.png`, fullPage: true });
}

async function checkReducedMotion(browser, viewport) {
  const name = viewportName(viewport);
  const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
  await installInstrumentation(context);
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
  for (const path of ["/record", "/result/sample", "/result/demo-legacy", "/analyzing/demo-script"]) {
    const context = await browser.newContext({ viewport });
    await installInstrumentation(context);
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
    await installInstrumentation(context);
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
