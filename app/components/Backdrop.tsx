"use client";

import SideRays from "./SideRays";

export default function Backdrop({ opacity = 0.4 }: { opacity?: number }) {
  return (
    <div className="backdrop" aria-hidden="true">
      <SideRays rayColor1="#00FF87" rayColor2="#0CEBEB" intensity={1.5} opacity={opacity} />
    </div>
  );
}
