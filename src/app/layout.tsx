import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PABRIK VIDEO // Automated Kitabedah.id Video Factory",
  description:
    "Multi-Agent Isometric 3D Explanatory Video Factory powered by Next.js 16, BullMQ FlowProducer, Omniroute LLM, UnlimitedTTS (Ethan 1.1x), and Remotion 60fps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body className="min-h-screen bg-[#090D16] text-slate-100 antialiased selection:bg-sky-500/30 selection:text-sky-200">
        {children}
      </body>
    </html>
  );
}
