"use client";

import { useState } from "react";

export function LeadEmbedCopyButton({ text }: { text: string }) {
  const [label, setLabel] = useState("Copy to clipboard");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setLabel("Copied");
      window.setTimeout(() => setLabel("Copy to clipboard"), 2000);
    } catch {
      setLabel("Copy failed");
      window.setTimeout(() => setLabel("Copy to clipboard"), 2000);
    }
  }

  return (
    <button type="button" onClick={copy} className="btn-secondary">
      {label}
    </button>
  );
}
