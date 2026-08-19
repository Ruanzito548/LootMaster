import localFont from "next/font/local";

// Oxanium — brand/display face: hero titles, headings, page names, premium callouts.
export const fontDisplay = localFont({
  src: [
    { path: "../public/fonts/oxanium/Oxanium-ExtraLight.ttf", weight: "200", style: "normal" },
    { path: "../public/fonts/oxanium/Oxanium-Light.ttf", weight: "300", style: "normal" },
    { path: "../public/fonts/oxanium/Oxanium-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/oxanium/Oxanium-Medium.ttf", weight: "500", style: "normal" },
    { path: "../public/fonts/oxanium/Oxanium-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../public/fonts/oxanium/Oxanium-Bold.ttf", weight: "700", style: "normal" },
    { path: "../public/fonts/oxanium/Oxanium-ExtraBold.ttf", weight: "800", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
});

// Oxanium — default interface face: navbar, buttons, labels, cards, body copy.
export const fontUi = localFont({
  src: [
    { path: "../public/fonts/oxanium/Oxanium-Light.ttf", weight: "300", style: "normal" },
    { path: "../public/fonts/oxanium/Oxanium-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/oxanium/Oxanium-Medium.ttf", weight: "500", style: "normal" },
    { path: "../public/fonts/oxanium/Oxanium-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../public/fonts/oxanium/Oxanium-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-ui",
  display: "swap",
});

// Energy — data face: coins, levels, XP, stats, timers, rankings.
export const fontData = localFont({
  src: [
    { path: "../public/fonts/energy_3/Energy.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/energy_3/Energy.ttf", weight: "500", style: "normal" },
    { path: "../public/fonts/energy_3/Energy.ttf", weight: "600", style: "normal" },
    { path: "../public/fonts/energy_3/Energy.ttf", weight: "700", style: "normal" },
    { path: "../public/fonts/energy_3/Energy.ttf", weight: "800", style: "normal" },
    { path: "../public/fonts/energy_3/Energy.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-data",
  display: "swap",
});
