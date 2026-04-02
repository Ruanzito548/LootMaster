import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "./components/navbar";
import { Footer } from "./components/footer";

export const metadata: Metadata = {
  title: "Loot Master",
  description: "World of Warcraft gold marketplace flow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
