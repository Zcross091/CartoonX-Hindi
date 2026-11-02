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
        {/* In-App Automatic Updater */}
        <UpdateNotifier />
      </body>
    </html>
  );
}
