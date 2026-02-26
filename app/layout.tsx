import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Lexend, Manrope } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import ResponsiveToaster from "@/components/ui/ResponsiveToaster";
import "./globals.css";
import { Providers } from "./providers";
import InstallPrompt from "@/components/InstallPrompt";
import UpdatePrompt from "@/components/UpdatePrompt";
import NotificationPrompt from "@/components/NotificationPrompt";
import { validateEnvironmentVariables } from "@/lib/env-validation";

// Validate environment variables on app startup (server-side only)
// This will throw an error if required variables are missing
if (typeof window === 'undefined') {
  validateEnvironmentVariables();
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Forge Trainer",
  description: "Real-time messaging app for gym trainers and clients",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Forge",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#E8923A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{__html: `
          try {
            var s = localStorage.getItem('theme-mode');
            if (s === 'dark' || (s === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            }
          } catch (e) {}
        `}} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Forge" />
        {/* Apple Touch Icon */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* iOS Splash Screens */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphone5.png"
          media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphone6.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphoneplus.png"
          media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphonex.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphonexr.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphonexsmax.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)"
        />
        {/* iPhone 12/13/14 — 390x844 @3x */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphone12.svg"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
        />
        {/* iPhone 12/13/14 Pro Max — 428x926 @3x */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphone12promax.svg"
          media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)"
        />
        {/* iPhone 14 Pro / 15 / 15 Pro / 16 / 16 Pro — 393x852 @3x */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphone16pro.svg"
          media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)"
        />
        {/* iPhone 14 Pro Max / 15 Pro Max / 16 Pro Max — 430x932 @3x */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphone16promax.svg"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/ipad.png"
          media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${lexend.variable} ${manrope.variable} font-[--font-lexend] antialiased`}
      >
        <Providers>{children}</Providers>
        <ResponsiveToaster />
        <InstallPrompt />
        <UpdatePrompt />
        <NotificationPrompt />
        <SpeedInsights />
      </body>
    </html>
  );
}
