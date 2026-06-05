import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "./components/navbar";
import { Footer } from "./components/footer";
import { GameThemeProvider } from "./components/game-theme-provider";

export const metadata: Metadata = {
  title: "Loot Master",
  description: "World of Warcraft gold marketplace flow",
  icons: {
    icon: "/lootmasterlogo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="relative flex min-h-full flex-col overflow-x-hidden theme-transition-surface">
        <GameThemeProvider>
          <div aria-hidden className="theme-ambient-overlay pointer-events-none fixed inset-0 z-0" />
          <div className="relative z-10 flex min-h-full flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </GameThemeProvider>
      </body>
    </html>
  );
}
