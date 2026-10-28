import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Réflexions | Débats",
  description: "Des débats construits, des idées qui se répondent."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <header className="site-header">
          <Link className="wordmark" href="/" aria-label="Réflexions, accueil">
            <span className="wordmark-mark">R</span>
            <span>réflexions</span>
          </Link>
          <nav aria-label="Navigation principale">
            <Link href="/">Débats</Link>
            <Link className="nav-create" href="/debates/new">+ Lancer un débat</Link>
          </nav>
        </header>
        {children}
        <footer className="site-footer">Un espace pour penser ensemble.</footer>
      </body>
    </html>
  );
}