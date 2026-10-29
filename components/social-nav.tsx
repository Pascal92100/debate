import Link from "next/link";

export function SocialNav({ active }: { active: "feed" | "circles" | "profiles" }) {
  return <nav className="social-nav" aria-label="Circles navigation">
    <Link href="/circle">Circle account</Link>
    <Link className={active === "feed" ? "active" : ""} href="/social">Feed</Link>
    <Link className={active === "circles" ? "active" : ""} href="/social/circles">Circles</Link>
    <Link className={active === "profiles" ? "active" : ""} href="/social/profiles">Profiles</Link>
  </nav>;
}
