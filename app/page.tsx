import { redirect } from "next/navigation";
import Link from "next/link";
import { getAccountCount } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!process.env.DATABASE_URL) redirect("/circle");
  if ((await getAccountCount()) > 0) redirect("/login");
  return <main className="form-shell auth-shell"><p className="eyebrow">Circles</p><h1 className="serif">Welcome</h1><p className="form-lead">Create the private primary account to begin setting up your profiles and Circles.</p><Link className="button-primary" href="/setup">Create the first account</Link></main>;
}