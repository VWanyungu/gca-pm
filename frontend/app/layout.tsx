import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/auth-context";
import { Providers } from "./providers";
import { ErrorToastViewport } from "@/components/ui/error-toast-viewport";
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
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
        <ErrorToastViewport />
      </body>
    </html>
  );
}
