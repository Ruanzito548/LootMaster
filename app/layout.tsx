import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Navbar } from "./components/navbar";
import { Footer } from "./components/footer";
import { GameThemeProvider } from "./components/game-theme-provider";
import { RouteScrollReset } from "./components/route-scroll-reset";

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
    <html lang="en" className="h-full antialiased" data-game-theme="tbc-anniversary">
      <body className="relative flex min-h-full flex-col overflow-x-hidden theme-transition-surface">
        <GameThemeProvider>
          <RouteScrollReset />
          <div aria-hidden className="theme-ambient-overlay pointer-events-none fixed inset-0 z-0" />
          <div className="relative z-10 flex min-h-full flex-col">
            <Navbar />
            <main className="flex-1 overflow-x-hidden pt-20">{children}</main>
            <Footer />
          </div>
        </GameThemeProvider>
        <Script id="tawk-to" strategy="afterInteractive">
          {`
            var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();
            (function() {
              var s1 = document.createElement("script"), s0 = document.getElementsByTagName("script")[0];
              s1.async = true;
              s1.src = "https://embed.tawk.to/6a22f7055bdfa41c2ccf2c3d/1jqc99s3m";
              s1.charset = "UTF-8";
              s1.setAttribute("crossorigin", "*");
              s0.parentNode.insertBefore(s1, s0);
            })();
          `}
        </Script>
      </body>
    </html>
  );
}
