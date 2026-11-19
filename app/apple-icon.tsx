import { ImageResponse } from "next/og";

// iOS home-screen icon. Same chevron mark as app/icon.svg; iOS ignores SVG icons and applies its own corner mask.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#080808" }}>
        <svg width="124" height="116" viewBox="0 -2 64 62" fill="none">
          <path d="M4 22 L32 2 L60 22" stroke="#F7F5F0" strokeWidth="7" strokeLinejoin="miter" fill="none" />
          <path d="M4 38 L32 18 L60 38" stroke="#F7F5F0" strokeWidth="7" strokeLinejoin="miter" fill="none" />
          <path d="M4 54 L32 34 L60 54" stroke="#F7F5F0" strokeWidth="7" strokeLinejoin="miter" fill="none" />
        </svg>
      </div>
    ),
    size,
  );
}
