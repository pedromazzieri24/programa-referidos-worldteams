import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { Header } from "./components/Header";
import "./globals.css";

// Las tipografías de worldteams.com: Space Grotesk (títulos y botones) y Manrope (texto).
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Talent Referral Program · WorldTeams",
  description: "Refer architecture and engineering professionals from LATAM and earn a reward when they get hired.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${spaceGrotesk.variable} ${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <div className="flex-1">{children}</div>
        <footer className="bg-wt-negro py-6 text-center text-xs text-zinc-400">
          Technical exercise (MVP). Sample data and amounts.
        </footer>
      </body>
    </html>
  );
}
