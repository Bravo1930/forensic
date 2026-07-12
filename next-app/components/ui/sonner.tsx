"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="dark"
      toastOptions={{
        style: {
          background: "oklch(0.2 0.02 25)",
          border: "1px solid oklch(0.3 0.02 25)",
          color: "oklch(0.985 0 0)",
        },
      }}
    />
  );
}
