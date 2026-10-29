"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AuthForm({ mode, nextPath = "/circle" }: { mode: "setup" | "login"; nextPath?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(mode === "setup" ? "/api/auth/bootstrap" : "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: form.get("displayName"), email: form.get("email"), password: form.get("password") })
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error ?? "The request could not be completed.");
      setBusy(false);
      return;
    }
    router.replace(mode === "login" && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/circle");
    router.refresh();
  }

  return <form className="form-panel auth-panel" onSubmit={submit}>
    {mode === "setup" && <div className="field"><label htmlFor="displayName">Your name</label><input id="displayName" name="displayName" required minLength={2} maxLength={100} autoComplete="name" /></div>}
    <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" /></div>
    <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required minLength={mode === "setup" ? 12 : 1} autoComplete={mode === "setup" ? "new-password" : "current-password"} />{mode === "setup" && <span className="field-hint">Use at least 12 characters.</span>}</div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button-primary" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "setup" ? "Create account" : "Sign in"}</button>
  </form>;
}