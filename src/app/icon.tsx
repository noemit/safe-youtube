import { ImageResponse } from "next/og";

export const size = {
  width: 192,
  height: 192,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background:
            "linear-gradient(145deg, rgb(251, 245, 235), rgb(244, 222, 213))",
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
            borderRadius: "40px",
            color: "white",
            display: "flex",
            fontSize: 82,
            fontWeight: 700,
            height: 140,
            justifyContent: "center",
            letterSpacing: "-0.06em",
            width: 140,
          }}
        >
          SY
        </div>
      </div>
    ),
    size,
  );
}

