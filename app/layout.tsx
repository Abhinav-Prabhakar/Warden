import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-urbanist",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Warden — Hospital Ward Operations",
  description: "Live voice-first operational coordination agent for acute hospital wards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${urbanist.variable} h-full antialiased dark`}>
      <body className="min-h-full bg-[#2E333A] text-white font-sans overflow-hidden select-none">
        {children}
      </body>
    </html>
  );
}
