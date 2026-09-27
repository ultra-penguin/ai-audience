import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** PNG rendition of icon.svg (iOS ignores SVG touch icons). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "#1d4ed8" }}>
        {["#89f5e7", "#ffffff", "#ffdcc3"].map((color) => (
          <div key={color} style={{ width: 29, height: 29, borderRadius: 999, background: color }} />
        ))}
      </div>
    ),
    size,
  );
}
