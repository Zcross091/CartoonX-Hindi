import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { UpdateNotifier } from '@/components/UpdateNotifier';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f172a',
};

export const metadata: Metadata = {
  title: 'CartoonX - Hindi Cartoons for Indian Kids',
  description: 'Stream Hindi dubbed cartoons, Doraemon, Shinchan, Pokemon, and animated movies safely with in-app downloads, in-app updater, and continue watching.',
  keywords: ['CartoonX', 'Hindi Cartoons', 'Doraemon in Hindi', 'Shinchan Hindi', 'Rare Toon India', 'Kids Cartoons India'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://raretoonindia.in" />
        <link rel="preconnect" href="https://img-place.com" />
      </head>
      <body className="antialiased selection:bg-amber-400 selection:text-slate-950 pb-20 md:pb-8">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        {/* Permanent Hovering Signature Watermark */}
        <div 
          id="author-watermark" 
          className="fixed bottom-3 right-4 sm:bottom-4 sm:right-6 z-[70] pointer-events-none select-none flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/70 backdrop-blur-md border border-white/10 shadow-lg text-[11px] sm:text-xs font-semibold text-slate-300"
        >
          <span>Made by</span>
          <span className="font-black text-amber-400 tracking-wide">Zcross</span>
        </div>
        {/* In-App Automatic Updater */}
        <UpdateNotifier />
      </body>
    </html>
  );
}
