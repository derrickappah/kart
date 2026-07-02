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
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${jakarta.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased">
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  );
}
