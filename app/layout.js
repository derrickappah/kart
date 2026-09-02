import { Plus_Jakarta_Sans } from "next/font/google";
import LayoutWrapper from "../components/LayoutWrapper";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: '--font-jakarta'
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.kart.cx'),
  title: "KART | Campus Marketplace",
  description: "The premium marketplace for students.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "KART | Campus Marketplace",
    description: "The premium marketplace for students.",
    url: "https://www.kart.cx",
    siteName: "KART",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "KART Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "KART | Campus Marketplace",
    description: "The premium marketplace for students.",
    images: ["/icon.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KART",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-touch-fullscreen": "yes",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${jakarta.variable}`} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.deferredPWAInstallPrompt = null;
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                window.deferredPWAInstallPrompt = e;
                window.dispatchEvent(new CustomEvent('pwa-prompt-available', { detail: e }));
              });
              window.addEventListener('appinstalled', function() {
                window.deferredPWAInstallPrompt = null;
                window.dispatchEvent(new CustomEvent('pwa-installed'));
              });
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.error('SW registration error:', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  );
}
