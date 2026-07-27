import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const fontData = await readFile(join(process.cwd(), "assets/fonts/BebasNeue-Regular.ttf"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#080808",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg width="90" height="81" viewBox="1 -1 62 58" fill="none">
            <path d="M4 22 L32 2 L60 22" stroke="rgba(247,245,240,0.7)" strokeWidth="6" strokeLinejoin="miter" fill="none" />
            <path d="M4 38 L32 18 L60 38" stroke="rgba(247,245,240,0.7)" strokeWidth="6" strokeLinejoin="miter" fill="none" />
            <path d="M4 54 L32 34 L60 54" stroke="rgba(247,245,240,0.7)" strokeWidth="6" strokeLinejoin="miter" fill="none" />
          </svg>
          <div
            style={{
              display: "flex",
              fontFamily: "Bebas Neue",
              fontSize: 108,
              letterSpacing: 4,
              color: "rgba(247,245,240,0.85)",
              lineHeight: 1,
            }}
          >
            Edge Analysts
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Bebas Neue",
          data: fontData,
          style: "normal",
          weight: 400,
        },
      ],
    }
  );
}
