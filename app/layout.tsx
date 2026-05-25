import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "./components/navbar";
import { Footer } from "./components/footer";

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
      <body className="relative flex min-h-full flex-col overflow-x-hidden">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 14% 4%, rgba(67,210,255,0.16), transparent 26%), radial-gradient(circle at 86% 6%, rgba(255,199,90,0.1), transparent 22%), radial-gradient(circle at 50% 100%, rgba(56,129,255,0.1), transparent 32%)",
          }}
        />
        <div className="relative z-10 flex min-h-full flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
