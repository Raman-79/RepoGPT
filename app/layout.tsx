import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionProviderAuth from "./SessionProvider";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Repo GPT 🛠️",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <SessionProviderAuth>
      <body 
        className={`${geistSans.variable} ${geistMono.variable}  bg-gradient-to-b from-gray-900 via-gray-800 to-black`}
      >
        {children}
      </body>
      </SessionProviderAuth>
    </html>
  );
}
