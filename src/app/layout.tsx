import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PABRIK-VIDEO // CAD SCHEMATIC CONTROL BAY",
  description: "Autonomous Short-Form Video Manufacturing Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[#071324] text-[#F0F9FF] antialiased selection:bg-[#38BDF8] selection:text-[#071324]">
        {children}
      </body>
    </html>
  );
}
