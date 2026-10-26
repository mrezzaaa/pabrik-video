import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PABRIK VIDEO — FB Pro Reels Factory",
  description:
    "Ketik topik, pipeline multi-agent bikin naskah viral, voice, visual, dan render Reels 9:16 otomatis.",
  applicationName: "Pabrik Video",
};

export const viewport: Viewport = {
  themeColor: "#050505",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="relative min-h-full bg-background text-foreground">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 factory-grid opacity-60"
        />
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,rgba(57,255,20,0.07),transparent_55%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        />
        <div className="relative z-10 flex min-h-screen flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
