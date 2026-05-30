import { Plus_Jakarta_Sans } from "next/font/google";
import LayoutWrapper from "../components/LayoutWrapper";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: '--font-jakarta'
});

export const metadata = {
  title: "KART | Campus Marketplace",
  description: "The premium marketplace for students.",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
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
