import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/auth-context";
import { Providers } from "./providers";
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gas Connect Africa",
  description: "GCA PDM Platform",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full ${geist.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
