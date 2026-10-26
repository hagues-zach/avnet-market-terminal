"use client";

import { useEffect } from "react";

/**
 * The source line at the foot of every printed page (src/app/print.css). Put it
 * inside the element marked data-print="avnet". Where the browser draws @page
 * margin boxes, the line goes there, beside the page number; elsewhere this
 * element prints as a fixed footer. Hidden on screen.
 */
export function PrintFooter({ children }: { children: string }) {
  useEffect(() => {
    if (!("CSSMarginRule" in window)) return;
    const root = document.documentElement;
    root.style.setProperty("--avnet-print-source", `"${children.replace(/["\\]/g, "\\$&")}"`);
    root.setAttribute("data-print-margins", "");
    return () => {
      root.style.removeProperty("--avnet-print-source");
      root.removeAttribute("data-print-margins");
    };
  }, [children]);

  return (
    <p data-print-footer hidden>
      {children}
    </p>
  );
}
