import { ImageResponse } from "next/og";
import { BAUSTIFT_MARK_DATA_URI } from "@/lib/baustift-mark-svg";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
        <img src={BAUSTIFT_MARK_DATA_URI} width={380} height={380} alt="" />
      </div>
    ),
    { ...size },
  );
}
