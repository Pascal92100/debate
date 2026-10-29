import type { Metadata } from "next";
import { SiteChrome } from "@/components/site-chrome";
import "./globals.css";

export const metadata: Metadata = {
  title: "Réflexions | Débats",
  description: "Des débats construits, des idées qui se répondent."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <SiteChrome />
        {children}
        <footer className="site-footer">Un espace pour penser ensemble.</footer>
      </body>
    </html>
  );
}