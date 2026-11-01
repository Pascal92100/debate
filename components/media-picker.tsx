"use client";

import { ChangeEvent, useRef, useState } from "react";
import type { MediaAttachment } from "@/lib/media";

export function MediaPicker({ profileId, media, onChange, compact = false }: { profileId: string; media: MediaAttachment[]; onChange: (media: MediaAttachment[]) => void; compact?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    if (media.length + files.length > 8) {
      setError("A publication can include up to eight images or videos.");
      return;
    }
    setBusy(true);
    setError("");
    const uploaded: MediaAttachment[] = [];
    for (const file of files) {
      const form = new FormData();
      form.set("file", file);
      form.set("profileId", profileId);
      const response = await fetch("/api/media", { method: "POST", body: form }).catch(() => null);
      const result = await response?.json().catch(() => null);
      if (!response?.ok) {
        setError(result?.error || `Could not upload ${file.name}.`);
        break;
      }
      uploaded.push(result.media as MediaAttachment);
    }
    if (uploaded.length) onChange([...media, ...uploaded]);
    setBusy(false);
  }

  return <div className={`media-picker${compact ? " media-picker-compact" : ""}`}>
    <input ref={inputRef} className="media-picker-input" type="file" accept="image/*,video/*" multiple onChange={upload} />
    <button className="media-picker-trigger" type="button" onClick={() => inputRef.current?.click()} disabled={busy || media.length >= 8}>{busy ? "Uploading…" : "+ Photo / video"}</button>
    {media.length > 0 && <div className="media-picker-list">{media.map((item, index) => <div className="media-picker-item" key={`${item.pathname}-${index}`}>
      {item.contentType.startsWith("image/") ? <img src={item.url} alt={item.name} /> : <video src={item.url} controls preload="metadata" />}
      <span>{item.name}</span><button type="button" aria-label={`Remove ${item.name}`} onClick={() => onChange(media.filter((_, itemIndex) => itemIndex !== index))}>×</button>
    </div>)}</div>}
    {error && <span className="form-error" role="alert">{error}</span>}
  </div>;
}