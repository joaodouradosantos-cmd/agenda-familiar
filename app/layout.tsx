import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import SwRegister from "./SwRegister";
import NavBar from "./components/NavBar";

export const metadata: Metadata = {
  title: "Agenda Familiar",
  description: "Organize as tarefas e os eventos da família, com suporte offline.",
  manifest: "/manifest.webmanifest",
  themeColor: "#ffffff",
  appleWebApp: {
    title: "Agenda Familiar",
    statusBarStyle: "default",
    capable: true,
  },

  icons: {
    apple: { sizes: "180x180", url: "/icon-192.png" },
  },

};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-PT">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <SwRegister />
        <NavBar />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
