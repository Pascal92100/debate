import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getAccountCount } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (!process.env.DATABASE_URL) redirect("/circle");
  await getAccountCount();
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    return <main className="form-shell auth-shell"><p className="eyebrow">Account sign-up</p><h1 className="serif">Server configuration required</h1><p className="form-lead">Set SESSION_SECRET to a random value of at least 32 characters in Vercel Environment Variables, then redeploy to create your account.</p></main>;
  }
  return <main className="form-shell auth-shell"><Link href="/" className="wordmark">Circles</Link><p className="eyebrow">Account sign-up</p><h1 className="serif">Create your account</h1><p className="form-lead">Your private account stores login and personal details. Profiles are created separately and only when you choose to add one.</p><AuthForm mode="setup" /></main>;
}