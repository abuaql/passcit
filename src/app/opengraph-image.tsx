import { ImageResponse } from "next/og";

export const alt = "Passcit — U.S. Citizenship Test Practice";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#faf9f6",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 96,
              height: 96,
              borderRadius: 24,
              backgroundColor: "#3aa655",
            }}
          >
            <div style={{ fontSize: 56, color: "#ffffff", display: "flex" }}>🎓</div>
          </div>
          <div style={{ fontSize: 92, fontWeight: 800, color: "#1a1d23", display: "flex" }}>
            Passcit
          </div>
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 34,
            fontWeight: 600,
            color: "#2c5fba",
            display: "flex",
          }}
        >
          U.S. Citizenship Test Practice
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 24,
            color: "#6b7280",
            display: "flex",
          }}
        >
          Flashcards · Practice Interviews · Progress Tracking
        </div>
      </div>
    ),
    { ...size }
  );
}
