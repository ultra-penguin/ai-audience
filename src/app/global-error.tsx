"use client";

import { useEffect } from "react";

/** Replaces the root layout when it fails, so it can't rely on globals.css — styles are inline. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ko">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#f5f5f7", color: "#161618", fontFamily: "system-ui, -apple-system, 'Apple SD Gothic Neo', sans-serif" }}>
        <title>오류 · AI 가상 관중 발표 리뷰어</title>
        <div role="alert" style={{ maxWidth: 480, padding: "0 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 28, margin: "0 0 12px" }}>일시적인 문제가 생겼어요</h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "#68686f", margin: "0 0 24px" }}>잠시 후 다시 시도해 주세요.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ height: 44, padding: "0 16px", border: 0, borderRadius: 12, background: "#3b66ed", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
