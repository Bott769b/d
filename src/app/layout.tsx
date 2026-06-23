import type { Metadata } from "next";
import { Inter_Tight, Instrument_Serif, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-sans-family",
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic", "normal"],
  variable: "--font-serif-family",
  display: "swap",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono-family",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cavoti · Relay",
  description:
    "An editorial chat surface wired to the Cavoti relay. Bring the body in motion.",
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 4 C 12.6 9 12.6 15 12 20' stroke='%23c84b31' stroke-width='1.1' fill='none'/%3E%3Cpath d='M11.6 6 C 6 4.5 2.5 8 4 12 C 5 14.6 8.5 14.5 11.6 12.4 Z' fill='%23c84b31'/%3E%3Cpath d='M12.4 6 C 18 4.5 21.5 8 20 12 C 19 14.6 15.5 14.5 12.4 12.4 Z' fill='%23c84b31'/%3E%3C/svg%3E",
      },
    ],
  },
};

/**
 * Tiny inline script: applies the saved theme before React hydrates so the
 * page never flashes the wrong palette. Reads only one localStorage key and
 * adds a single class. Safe to fail.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('cavoti.theme');
    var theme = stored === 'ink' || stored === 'paper'
      ? stored
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'ink' : 'paper');
    if (theme === 'ink') document.documentElement.classList.add('theme-ink');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${serif.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        style={{
          fontFamily: "var(--font-sans-family), var(--font-sans)",
        }}
      >
        {children}
      </body>
    </html>
  );
}
