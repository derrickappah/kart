import { Plus_Jakarta_Sans } from "next/font/google";
import LayoutWrapper from "../components/LayoutWrapper";
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

export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    return (
      <html lang="en" className={`${jakarta.variable}`}>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
        </head>
        <body className="antialiased">
          <LayoutWrapper user={user}>
            {children}
          </LayoutWrapper>
        </body>
      </html>
    );
  } catch (error) {
    return (
      <html lang="en">
        <body>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1>System Error</h1>
            <p>Please check Vercel logs for [RootLayout] Critical Error</p>
            <pre style={{ textAlign: 'left', display: 'inline-block' }}>{error.message}</pre>
          </div>
        </body>
      </html>
    );
  }
}
