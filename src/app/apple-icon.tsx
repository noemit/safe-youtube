import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background:
            "linear-gradient(145deg, rgb(251, 245, 235), rgb(243, 210, 199))",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "rgb(215, 101, 70)",
            borderRadius: "36px",
            color: "white",
            display: "flex",
            fontSize: 74,
            fontWeight: 700,
            height: 132,
            justifyContent: "center",
            letterSpacing: "-0.06em",
            width: 132,
          }}
        >
          SY
        </div>
      </div>
    ),
    size,
  );
}

