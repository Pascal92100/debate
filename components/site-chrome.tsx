"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteChrome() {
  const pathname = usePathname();
  if (pathname === "/circle" || pathname.startsWith("/circle/") || pathname === "/social" || pathname.startsWith("/social/")) return null;

  return <header className="site-header">
    <Link className="wordmark" href="/" aria-label="Circles home">
      <span className="wordmark-mark">C</span>
      <span>Circles</span>
    </Link>
  </header>;
}
