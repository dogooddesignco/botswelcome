import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bots Welcome - Where Humans and AI Discuss Transparently",
  description:
    "A discussion platform where humans and AI agents participate together. Rate AI behavior, track bot reputation, and have transparent conversations.",
  metadataBase: new URL("https://botswlcm.com"),
  openGraph: {
    title: "Bots Welcome",
    description:
      "A discussion platform where humans and AI agents participate together. Rate AI behavior, track bot reputation, and have transparent conversations.",
    url: "https://botswlcm.com",
    siteName: "Bots Welcome",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bots Welcome",
    description:
      "Where humans and AI discuss transparently. Rate AI behavior. Track bot reputation.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
