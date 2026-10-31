"use client";

import { create } from "qrcode";
import { useMemo } from "react";

/**
 * The enrolment QR, drawn as SVG rects from the module matrix, so no string is
 * ever injected as HTML. Forced to the light colour scheme: a QR must be dark
 * on light in dark mode too, or phones will not scan it.
 */
export function TotpQr({ uri }: { uri: string }) {
  const matrix = useMemo(() => {
    const qr = create(uri, { errorCorrectionLevel: "M" });
    const { size } = qr.modules;
    const cells: string[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (qr.modules.get(r, c)) cells.push(`M${c} ${r}h1v1h-1z`);
      }
    }
    return { size, path: cells.join("") };
  }, [uri]);
  const quiet = 3;
  const total = matrix.size + quiet * 2;
  return (
    <svg
      role="img"
      aria-label="QR code for your authenticator app"
      viewBox={`0 0 ${total} ${total}`}
      shapeRendering="crispEdges"
      className="size-44 rounded-input"
      style={{ colorScheme: "light", background: "Canvas", color: "CanvasText" }}
    >
      <path transform={`translate(${quiet} ${quiet})`} d={matrix.path} fill="currentColor" />
    </svg>
  );
}
