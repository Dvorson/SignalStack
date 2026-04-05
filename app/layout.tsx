import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/chat/sidebar";
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
  title: "SignalStack — Smart Money Intelligence",
  description: "AI-powered onchain smart money analytics built on Nansen CLI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark`}
    >
      <body className="min-h-dvh flex antialiased">
        <Sidebar />
        {/* Header */}
        <div className="flex-1 flex flex-col ml-0 transition-all">
          <header className="flex items-center px-4 py-3 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10 pl-14">
            <div className="flex items-center gap-2">
              <span className="text-data font-bold font-mono text-sm tracking-wider">SIGNALSTACK</span>
              <span className="text-[10px] text-muted-foreground font-mono">powered by Nansen</span>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
