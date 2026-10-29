import type { Metadata } from "next";
import { SiteChrome } from "@/components/site-chrome";
import "./globals.css";

export const metadata: Metadata = {
  title: "Circles | Debates",
  description: "Structured debates where ideas meet."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteChrome />
        {children}
        <footer className="site-footer">A place to think together.</footer>
      </body>
    </html>
  );
}