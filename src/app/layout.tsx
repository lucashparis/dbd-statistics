import type { Metadata } from "next";
import { Cinzel, Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DBD Killer Tracker",
  description: "Track your Dead by Daylight killer statistics",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${cinzel.variable} ${geist.variable} ${jetbrainsMono.variable} antialiased scrollbar-dark`}
        style={{ fontFamily: "var(--font-geist), sans-serif" }}
      >
        <Toaster
          theme="dark"
          position="top-right"
          richColors
          closeButton
          expand
          toastOptions={{ duration: 5000 }}
        />
        {children}
      </body>
    </html>
  );
}
