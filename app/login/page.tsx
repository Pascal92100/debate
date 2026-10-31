import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getAccountCount } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (!process.env.DATABASE_URL) redirect("/circle");
  if ((await getAccountCount()) === 0) redirect("/setup");
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    return <main className="form-shell auth-shell"><p className="eyebrow">Circles account</p><h1 className="serif">Server configuration required</h1><p className="form-lead">Set SESSION_SECRET to a random value of at least 32 characters in Vercel Environment Variables, then redeploy.</p></main>;
  }
  const { next } = await searchParams;
  return <main className="form-shell auth-shell"><p className="eyebrow">Circles account</p><h1 className="serif">Sign in</h1><p className="form-lead">Use the email and password for your account.</p><AuthForm mode="login" nextPath={next} /><p className="auth-signup-link">New to Circles? <a href="/setup">Create an account</a></p></main>;
}