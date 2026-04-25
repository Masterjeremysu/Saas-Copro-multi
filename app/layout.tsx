import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CoproSync — Gestion de Copropriété Connectée",
    template: "%s | CoproSync"
  },
  description: "Plateforme SaaS de gestion de copropriété. Signalements, votes, contrats, agenda et communication résidents en temps réel.",
  keywords: ["copropriété", "syndic", "gestion immobilière", "SaaS", "résidents", "signalements"],
  authors: [{ name: "CoproSync" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CoproSync",
  },
  icons: {
    icon: "/icon-512.png",
    apple: "/icon-512.png",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    title: "CoproSync — Gestion de Copropriété Connectée",
    description: "Centralisez les signalements, coordonnez les prestataires et informez les résidents en temps réel.",
    siteName: "CoproSync",
  },
};

export const viewport: Viewport = {
  themeColor: "#4F46E5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
