"use client";

import { useState } from "react";
import type { ProfileAlert } from "@/lib/profile-modules";

export function ProfileAlerts({ initialAlerts }: { initialAlerts: ProfileAlert[] }) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [error, setError] = useState("");

  async function markRead(alertId: string) {
    setError("");
    const response = await fetch(`/api/alerts/${encodeURIComponent(alertId)}`, { method: "PATCH" }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || "The alert could not be updated.");
      return;
    }
    setAlerts((current) => current.map((alert) => alert.id === alertId ? { ...alert, readAt: new Date().toISOString() } : alert));
  }

  return <>
    {error && <p className="form-error" role="alert">{error}</p>}
    {alerts.length ? <div className="profile-post-list">{alerts.map((alert) => <article className={`profile-activity-item profile-alert-item${alert.readAt ? " is-read" : ""}`} key={alert.id}><div className="profile-post-meta">{new Date(alert.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}{!alert.readAt && <span className="alert-unread-mark">Unread</span>}</div><strong>{String(alert.payload.title ?? alert.kind)}</strong><p>{String(alert.payload.message ?? alert.payload.text ?? "You have a new update for this profile.")}</p>{!alert.readAt && <button className="text-action" type="button" onClick={() => void markRead(alert.id)}>Mark as read</button>}</article>)}</div> : <p className="account-empty">No alerts for this profile yet.</p>}
  </>;
}