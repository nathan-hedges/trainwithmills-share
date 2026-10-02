import { ImageResponse } from "next/og";

// Branded 1200×630 card shown when a link to the site is shared (WhatsApp,
// iMessage, Instagram DM, LinkedIn, X, etc). Applies site-wide via the
// opengraph-image file convention.
export const alt = "Train with Mills - 1-on-1 fitness & nutrition coaching for women";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#2735b5",
          backgroundImage: "linear-gradient(135deg, #3a4fe0, #2330ab)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 132,
            height: 132,
            borderRadius: 30,
            backgroundColor: "rgba(255,255,255,0.12)",
            border: "3px solid rgba(255,255,255,0.3)",
            fontSize: 88,
            fontWeight: 800,
          }}
        >
          M
        </div>
        <div style={{ marginTop: 44, fontSize: 74, fontWeight: 800, letterSpacing: -2 }}>Train with Mills</div>
        <div style={{ marginTop: 18, display: "flex", fontSize: 30, opacity: 0.9 }}>
          1-on-1 fitness &amp; nutrition coaching for women
        </div>
      </div>
    ),
    { ...size },
  );
}
