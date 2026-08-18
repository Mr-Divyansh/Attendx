import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://attendx.netlify.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AttendX — Smart Attendance Management",
    template: "%s | AttendX",
  },
  description:
    "AttendX is a modular, dual-mode attendance platform combining a College Management System (Admin / Teacher / Student roles) with an independent Personal Attendance Tracker.",
  keywords: [
    "AttendX",
    "attendance",
    "college management",
    "student attendance",
    "personal tracker",
    "attendance management system",
    "college attendance software",
    "online attendance system",
    "student attendance tracker",
    "college attendance management",
  ],
  authors: [{ name: "AttendX" }],
  creator: "Divyansh Kumar",
  publisher: "AttendX",
  icons: {
    icon: "/Attendx-logo.png",
    shortcut: "/Attendx-logo.png",
    apple: "/Attendx-logo.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "AttendX",
    title: "AttendX — Smart Attendance Management",
    description:
      "A clean, secure platform where teachers mark attendance and students track their progress across every class — or track your own attendance privately with the Personal Tracker.",
    images: [
      {
        url: "/Attendx-logo.png",
        width: 512,
        height: 512,
        alt: "AttendX logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "AttendX — Smart Attendance Management",
    description:
      "A clean, secure platform where teachers mark attendance and students track their progress across every class — or track your own attendance privately with the Personal Tracker.",
    images: ["/Attendx-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <SonnerToaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}