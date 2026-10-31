import type { Metadata } from "next";
import { SiteChrome } from "@/components/site-chrome";
import "./globals.css";

export const metadata: Metadata = {
  title: "Circles",
  description: "A place to socialize."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteChrome />
        {children}
        <footer className="site-footer">A place to socialize.</footer>
      </body>
    </html>
  );
}