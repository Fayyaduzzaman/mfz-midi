import type { Metadata } from 'next';
import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import AppProviders from '@/components/AppProviders';
import SiteHeader from '@/components/SiteHeader';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk'
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
  weight: ['400', '500']
});

export const metadata: Metadata = {
  title: 'MFZ MIDI',
  description: 'Full-stack MIDI player and editor starter with Next.js + Supabase'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${ibmPlexMono.variable}`}>
      <body>
        <AppProviders>
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">{children}</main>
        </AppProviders>
      </body>
    </html>
  );
}
