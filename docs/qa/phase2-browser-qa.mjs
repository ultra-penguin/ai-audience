// Run: npm i playwright-core (outside the repo), start `next dev -p 3107` in HTTP mode, then `node phase2-browser-qa.mjs <screenshot-dir>`.
import { chromium } from "playwright-core";
const BASE = "http://localhost:3107";
const OUT = process.argv[2];
const log = (...a) => console.log(...a);
const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
const ctx = await browser.newContext({ permissions: ["microphone"], viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
const text = async () => (await page.locator("main, body").first().innerText()).replace(/\s+/g, " ");

// 1. Record (Chromium fake device = synthetic beep, NOT real speech) → upload → analyze → result
await page.goto(`${BASE}/record`);
await page.getByRole("button", { name: "녹음 시작" }).click();
await page.waitForTimeout(8000);
await page.getByRole("button", { name: "일시정지" }).click();
await page.waitForTimeout(500);
await page.getByRole("button", { name: "이어서 녹음" }).click();
await page.waitForTimeout(5000);
await page.getByRole("button", { name: "녹음 마치기" }).click();
const analyzeReq = page.waitForResponse((r) => r.url().includes("/analyze"));
const createReq = page.waitForResponse((r) => r.url().endsWith("/api/presentations"));
await page.screenshot({ path: `${OUT}/1-recorded.png` }); await page.getByRole("button", { name: "관중 분석 시작" }).click();
log("1 create:", (await createReq).status(), "analyze:", (await analyzeReq).status());
await page.waitForURL(/\/analyzing\//);
log("1 analyzing url:", page.url());
await page.screenshot({ path: `${OUT}/1-analyzing.png` });
await page.waitForURL(/\/result\//, { timeout: 30000 });
await page.getByText("샘플 결과예요").waitFor();
const t1 = await text();
log("1 result: sample label", t1.includes("샘플 결과예요"), "| personas 3:", t1.includes("관중 3명이 들었어요"));
await page.getByText("전체 스크립트 보기").click();
log("1 transcript visible:", await page.getByText("Today I will explain").isVisible());
await page.screenshot({ path: `${OUT}/1-result.png`, fullPage: true });
const id = page.url().split("/result/")[1];

// 2. Unknown id on analyzing + result
await page.goto(`${BASE}/analyzing/does-not-exist`);
await page.getByText("이 발표를 찾을 수 없어요").waitFor({ timeout: 10000 });
log("2 analyzing not-found notice ok; refetch button absent:", (await page.getByRole("button", { name: "다시 불러오기" }).count()) === 0);
await page.goto(`${BASE}/result/does-not-exist`);
await page.getByText("결과를 찾을 수 없어요").waitFor({ timeout: 10000 });
log("2 result not-found notice ok");

// 3. Result not ready (uploaded, analysis never started)
const form = new FormData();
form.append("audio", new Blob([new Uint8Array(64)], { type: "audio/webm" }), "a.webm");
form.append("durationSeconds", "30");
const created = await (await fetch(`${BASE}/api/presentations`, { method: "POST", body: form })).json();
await page.goto(`${BASE}/result/${created.presentationId}`);
await page.getByText("아직 분석이 끝나지 않았어요").waitFor({ timeout: 10000 });
log("3 not-ready notice ok");

// 4. Pipeline failure → retry (status endpoint forced to report failure once via route interception)
const f = new FormData();
f.append("audio", new Blob([new Uint8Array(64)], { type: "audio/webm" }), "a.webm");
f.append("durationSeconds", "30");
const c2 = await (await fetch(`${BASE}/api/presentations`, { method: "POST", body: f })).json();
let failOnce = true;
await page.route(`**/api/presentations/${c2.presentationId}/status`, async (route) => {
  if (!failOnce) return route.continue();
  await route.fulfill({ json: { presentationId: c2.presentationId, stage: "failed", progress: 1, error: { code: "provider_timeout", message: "Upstream STT timeout key=sk-123" }, failedStage: "transcribing", updatedAt: new Date().toISOString() } });
});
await page.goto(`${BASE}/analyzing/${c2.presentationId}`);
await page.getByText("분석을 마치지 못했어요").waitFor({ timeout: 10000 });
const t4 = await text();
log("4 failed notice ok; raw message hidden:", !t4.includes("sk-123") && !t4.includes("Upstream"), "| safe msg:", t4.includes("요청을 처리하지 못했어요"));
await page.screenshot({ path: `${OUT}/4-failed.png` });
failOnce = false;
await page.getByRole("button", { name: "다시 분석하기" }).click();
await page.waitForURL(/\/result\//, { timeout: 30000 });
log("4 retry reached result:", page.url().endsWith(c2.presentationId));

// 5. Network failure on result → error + retry button
await page.route("**/api/presentations/*/result", (r) => r.abort());
await page.goto(`${BASE}/result/${id}`);
await page.getByText("결과를 불러오지 못했어요").waitFor({ timeout: 20000 });
await page.unroute("**/api/presentations/*/result");
await page.getByRole("button", { name: "다시 불러오기" }).click();
await page.getByText("샘플 결과예요").waitFor({ timeout: 10000 });
log("5 network error + reload ok");

// 6. Mobile width: no horizontal scroll on result
await page.setViewportSize({ width: 375, height: 800 });
await page.goto(`${BASE}/result/${id}`);
await page.getByText("샘플 결과예요").waitFor();
log("6 mobile no h-scroll:", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
await page.screenshot({ path: `${OUT}/6-mobile.png`, fullPage: true });

log("console errors:", consoleErrors.filter((e) => !/Failed to load resource|ERR_FAILED|404|409/.test(e)));
await browser.close();
