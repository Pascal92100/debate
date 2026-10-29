"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteChrome() {
  const pathname = usePathname();
  if (pathname === "/circle" || pathname.startsWith("/circle/") || pathname === "/social" || pathname.startsWith("/social/")) return null;

  return <header className="site-header">
    <Link className="wordmark" href="/" aria-label="Réflexions, accueil">
      <span className="wordmark-mark">R</span>
      <span>réflexions</span>
    </Link>
    <nav aria-label="Navigation principale">
      <Link href="/debates">Débats</Link>
      <Link href="/circle">Circle</Link>
    </nav>
  </header>;
}
