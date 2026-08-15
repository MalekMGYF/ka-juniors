import "./globals.css";
import type { Metadata } from "next";
import SiteNotice from "../components/SiteNotice";

export const metadata: Metadata = {
  title: "K.A Juniors",
  description: "منصة K.A Juniors"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Marhey:wght@400;500;600;700&family=Cairo:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="stars" aria-hidden="true" />
        {children}
        <SiteNotice />
      </body>
    </html>
  );
}
