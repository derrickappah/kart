import { Plus_Jakarta_Sans } from "next/font/google";
import Navbar from "../components/Navbar";
import MobileBottomNav from "../components/MobileBottomNav";
import { createClient } from "../utils/supabase/server";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: '--font-jakarta'
});

export const metadata = {
  title: "KART | Campus Marketplace",
  description: "The premium marketplace for students.",
};

export default async function RootLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en" className={`${jakarta.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body className="antialiased">
        {/* Top Navigation */}
        <Navbar user={user} />

        {/* Page Content */}
        <main className="pt-16 pb-13">
          {children}
        </main>

        {/* Bottom Navigation */}
        <MobileBottomNav user={user} />
      </body>
    </html>
  );
}
