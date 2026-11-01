"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteEntityButton({ endpoint, label, confirmation, redirectTo, onDeleted, iconOnly = false }: { endpoint: string; label: string; confirmation: string; redirectTo?: string; onDeleted?: () => void; iconOnly?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!window.confirm(confirmation)) return;
    setBusy(true);
    setError("");
    const response = await fetch(endpoint, { method: "DELETE" }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || "This item could not be deleted.");
      setBusy(false);
      return;
    }
    onDeleted?.();
    if (redirectTo) router.replace(redirectTo);
    router.refresh();
  }

  return <div className={`delete-entity-control${iconOnly ? " delete-entity-icon-only" : ""}`}><button type="button" className={iconOnly ? "button-icon-danger" : "button-danger"} aria-label={label} title={label} onClick={remove} disabled={busy}>{busy ? "…" : iconOnly ? "🗑" : label}</button>{error && <span className="form-error" role="alert">{error}</span>}</div>;
}
