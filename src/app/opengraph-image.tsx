import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "AI 가상 관중 발표 리뷰어 — 발표를 녹음하면 AI 관중이 이해가 막히는 곳을 알려드려요";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Same Pretendard package as src/lib/fonts.ts; ImageResponse needs a static OTF for Hangul glyphs.
const fontPath = (weight: string) => join(process.cwd(), `node_modules/pretendard/dist/public/static/Pretendard-${weight}.otf`);

export default async function OpengraphImage() {
  const [bold, regular] = await Promise.all([readFile(fontPath("Bold")), readFile(fontPath("Regular"))]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#f5f5f7",
          color: "#161618",
          fontFamily: "Pretendard",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 700 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 999, border: "3px solid #161618" }}>
            <div style={{ width: 11, height: 11, borderRadius: 999, background: "#1d4ed8" }} />
          </div>
          AI 가상 관중 발표 리뷰어
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 72, fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.03em" }}>
            <span>관중이 어디서 멈추는지,</span>
            <span>발표 전에 먼저 들어보세요</span>
          </div>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 400, color: "#68686f", lineHeight: 1.4 }}>
            서로 다른 AI 관중이 이해가 막히는 곳과 고칠 문장을 알려드려요.
          </div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {["#1d4ed8", "#89f5e7", "#ffdcc3"].map((color) => (
            <div key={color} style={{ width: 20, height: 20, borderRadius: 999, background: color }} />
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Pretendard", data: bold, weight: 700, style: "normal" },
        { name: "Pretendard", data: regular, weight: 400, style: "normal" },
      ],
    },
  );
}
