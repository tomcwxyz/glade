import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "Glade — Governance that grows with your organisation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #f5f0ea 0%, #ece5d8 100%)",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* Decorative top-left accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "8px",
            background: "linear-gradient(90deg, #2d5c3f, #4a8f5e, #b8872e)",
          }}
        />

        {/* Tree icon cluster */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "#2d5c3f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2 L8 10 L4 18 L12 15 L20 18 L16 10 Z" fill="#f5f0ea" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "72px",
            fontWeight: 700,
            color: "#3d3428",
            lineHeight: 1.1,
            marginBottom: "20px",
            letterSpacing: "-1px",
          }}
        >
          Glade
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "32px",
            fontWeight: 400,
            color: "#6b5d4f",
            lineHeight: 1.4,
            maxWidth: "800px",
          }}
        >
          Governance that grows with your organisation
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginTop: "48px",
          }}
        >
          <div
            style={{
              padding: "8px 20px",
              borderRadius: "20px",
              background: "rgba(45, 92, 63, 0.1)",
              color: "#2d5c3f",
              fontSize: "16px",
              fontWeight: 600,
            }}
          >
            Decisions
          </div>
          <div
            style={{
              padding: "8px 20px",
              borderRadius: "20px",
              background: "rgba(45, 92, 63, 0.1)",
              color: "#2d5c3f",
              fontSize: "16px",
              fontWeight: 600,
            }}
          >
            Documents
          </div>
          <div
            style={{
              padding: "8px 20px",
              borderRadius: "20px",
              background: "rgba(45, 92, 63, 0.1)",
              color: "#2d5c3f",
              fontSize: "16px",
              fontWeight: 600,
            }}
          >
            Meetings
          </div>
          <div
            style={{
              padding: "8px 20px",
              borderRadius: "20px",
              background: "rgba(184, 135, 46, 0.1)",
              color: "#b8872e",
              fontSize: "16px",
              fontWeight: 600,
            }}
          >
            AI Insights
          </div>
        </div>

        {/* Domain */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            right: "80px",
            fontSize: "18px",
            color: "#8a7d6f",
            fontWeight: 500,
          }}
        >
          ourglade.app
        </div>
      </div>
    ),
    { ...size }
  );
}
