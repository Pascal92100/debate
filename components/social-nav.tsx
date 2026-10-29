import Link from "next/link";

export function SocialNav({ active }: { active: "feed" | "circles" | "profiles" }) {
  return <nav className="social-nav" aria-label="Navigation du réseau">
    <Link href="/circle">Compte</Link>
    <Link className={active === "feed" ? "active" : ""} href="/social">Fil</Link>
    <Link className={active === "circles" ? "active" : ""} href="/social/circles">Cercles</Link>
    <Link className={active === "profiles" ? "active" : ""} href="/social/profiles">Profils</Link>
  </nav>;
}
