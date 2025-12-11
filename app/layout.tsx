import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// 1. Importamos el componente visual
import { Toaster } from 'sonner'; 

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Keto App - Gestión Médica",
  description: "Plataforma de seguimiento nutricional para dieta cetogénica",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        {/* 2. El buzón de notificaciones */}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}