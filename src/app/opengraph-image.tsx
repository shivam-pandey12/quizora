import { ImageResponse } from "next/og";

export const alt = "Quizora premium quiz arena";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f8f1e3 0%, #f2d27c 48%, #dce9ff 100%)",
          color: "#17130a",
          fontFamily: "Arial, sans-serif",
          padding: 72
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            border: "2px solid rgba(111, 75, 20, 0.24)",
            borderRadius: 48,
            background: "rgba(255, 252, 244, 0.72)",
            boxShadow: "0 30px 80px rgba(45, 31, 9, 0.18)",
            padding: 64
          }}
        >
          <div style={{ fontSize: 34, fontWeight: 700, color: "#8a6114" }}>
            Quizora
          </div>
          <div
            style={{
              marginTop: 72,
              fontSize: 82,
              lineHeight: 1.02,
              fontWeight: 800,
              maxWidth: 860
            }}
          >
            Play, compete, and master quizzes.
          </div>
          <div style={{ marginTop: "auto", fontSize: 30, color: "#4f4638" }}>
            Solo quizzes • Live rooms • Leaderboards • Progress
          </div>
        </div>
      </div>
    ),
    size
  );
}
