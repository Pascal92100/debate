"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LeaveMetaProfileButton({ metaProfileId, memberProfileId, metaProfileName, returnTo = "/circle/meta-profiles" }: { metaProfileId: string; memberProfileId: string; metaProfileName: string; returnTo?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function leave() {
    if (!window.confirm(`Leave ${metaProfileName}? If you are its last member, the meta-profile will be deleted.`)) return;
    setBusy(true);
    setError("");
    const response = await fetch(`/api/social/profiles/${encodeURIComponent(metaProfileId)}/members/${encodeURIComponent(memberProfileId)}`, { method: "DELETE" }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || "Could not leave this meta-profile.");
      setBusy(false);
      return;
    }
    router.replace(result.deletedMetaProfile ? "/circle/meta-profiles" : returnTo);
    router.refresh();
  }

  return <div className="public-meta-leave-control">
    <button className="button-secondary" type="button" disabled={busy} onClick={() => void leave()}>{busy ? "Leaving…" : "Leave this meta-profile"}</button>
    {error && <span className="form-error" role="alert">{error}</span>}
  </div>;
}
