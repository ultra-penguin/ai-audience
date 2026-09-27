#!/usr/bin/env node
// Browser QA for the exhibition demo: node docs/qa/exhibition-qa.mjs <baseUrl> <screenshotDir>

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
const DEMO_IDS = ["demo-bfs", "demo-ai-ethics", "demo-recycling"];

if (!BASE_URL || !SCREENSHOT_DIR) {
  console.error("usage: node docs/qa/exhibition-qa.mjs <baseUrl> <screenshotDir>");
  process.exit(2);
}
await mkdir(SCREENSHOT_DIR, { recursive: true });

const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
};

async function noHorizontalScroll(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 0, `${label}: horizontal overflow ${overflow}px`);
}

const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH });
for (const reducedMotion of ["no-preference", "reduce"]) {
  for (const viewport of VIEWPORTS) {
    const tag = `${viewport.width}x${viewport.height}${reducedMotion === "reduce" ? "-reduced" : ""}`;
    const context = await browser.newContext({ viewport, reducedMotion, locale: "ko-KR" });
    const page = await context.newPage();
    const external = [];
    page.on("request", (req) => {
      const url = new URL(req.url());
      if (url.origin !== new URL(BASE_URL).origin && url.protocol.startsWith("http")) external.push(req.url());
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto(`${BASE_URL}/exhibition`, { waitUntil: "networkidle" });
    check((await page.locator('ol[aria-label="체험할 발표"] > li').count()) === 3, `${tag}: picker should list 3 demos`);
    await noHorizontalScroll(page, `${tag} picker`);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${tag}-1-picker.png` });

    for (const demoId of DEMO_IDS) {
      await page.goto(`${BASE_URL}/exhibition`, { waitUntil: "networkidle" });
      await page.click(`a[href="/exhibition/${demoId}"]`);
      await page.waitForURL(`**/exhibition/${demoId}`);
      await page.getByText("시뮬레이션 시작").waitFor();
      await noHorizontalScroll(page, `${tag} ${demoId} preview`);
      await page.waitForTimeout(2600);
      check(await page.getByText("준비됐어요").isVisible(), `${tag} ${demoId}: preview should settle into ready copy`);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/${tag}-${demoId}-2-preview.png` });

      await page.getByRole("button", { name: "시뮬레이션 시작" }).click();
      const states = new Set();
      const shots = { "관중이 듣는 중": "3-listening", "반응 비교": "4-comparing", "리포트 정리": "5-writing" };
      // Screenshot capture is intentionally part of this visual QA and can be
      // slower than the demo clock on reduced-motion/mobile contexts.
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline && !page.url().endsWith("/result")) {
        const active = await page.locator('[aria-label="진행 단계"] [aria-current="step"] p').first().textContent().catch(() => null);
        const label = active?.replace(/\(.*\)/, "").trim();
        if (label && !states.has(label)) {
          states.add(label);
          await page.waitForTimeout(label === "관중이 듣는 중" ? 1500 : 500);
          await noHorizontalScroll(page, `${tag} ${demoId} ${label}`);
          if (shots[label]) await page.screenshot({ path: `${SCREENSHOT_DIR}/${tag}-${demoId}-${shots[label]}.png` });
        }
        await page.waitForTimeout(120);
      }
      check(states.size >= 3, `${tag} ${demoId}: saw ${states.size} simulation states (${[...states].join(", ")})`);
      await page.waitForURL(`**/exhibition/${demoId}/result`, { timeout: 5000 }).catch(() => check(false, `${tag} ${demoId}: did not hand off to result`));
      await page.getByText("발표 리뷰 리포트").waitFor();
      check(await page.getByText("전시용 예시 리포트예요").isVisible(), `${tag} ${demoId}: exhibition notice missing`);
      check((await page.locator('a[href="/exhibition"]').count()) >= 1, `${tag} ${demoId}: return-to-demo CTA missing`);
      check((await page.locator('a[href="/record"]').count()) >= 1, `${tag} ${demoId}: real-presentation CTA missing`);
      await noHorizontalScroll(page, `${tag} ${demoId} result`);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/${tag}-${demoId}-6-result.png` });
      console.log(`${tag} ${demoId}: states=${[...states].join(" → ")}`);
    }

    const res = await page.goto(`${BASE_URL}/exhibition/does-not-exist`);
    check(res?.status() === 404, `${tag}: invalid id should 404`);
    check(await page.getByText("이 체험 발표를 찾을 수 없어요").isVisible(), `${tag}: invalid id copy missing`);
    if (viewport.width === 1920 && reducedMotion === "no-preference") await page.screenshot({ path: `${SCREENSHOT_DIR}/${tag}-7-invalid.png` });

    check(external.length === 0, `${tag}: external requests ${external.join(", ")}`);
    check(errors.length === 0, `${tag}: page errors ${errors.join(" | ")}`);
    await context.close();
  }
}
await browser.close();

if (failures.length) {
  console.error(`FAIL (${failures.length})\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("PASS");
