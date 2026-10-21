import type { Metadata } from "next";
import React from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "GlobalEye — Sime Darby Property Security Operations",
  description:
    "Intelligent township incident detection, dynamic relative urgency prioritization, and emergency response platform for Sime Darby Property Hackathon 2026.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/brand/globaleye-symbol.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-800 antialiased selection:bg-teal-700 selection:text-white">
        {children}
      </body>
    </html>
  );
}
