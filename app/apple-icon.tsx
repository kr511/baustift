import { ImageResponse } from "next/og";
import { BAUSTIFT_MARK_DATA_URI } from "@/lib/baustift-mark-svg";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#201e1b",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BAUSTIFT_MARK_DATA_URI} width={134} height={134} alt="" />
      </div>
    ),
    { ...size },
  );
}
