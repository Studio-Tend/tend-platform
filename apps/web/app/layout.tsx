import type { Metadata } from 'next';
import { SiteAnalytics } from '@/components/site/SiteAnalytics';
import { PlanSessionProvider } from '@/components/tend-flow/plan-session';
import { fraunces, inter } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.heytend.co'),
  title: {
    default: 'Tend — goals, with intention.',
    template: '%s — Tend',
  },
  description:
    'Tend is a goal app for making meaningful progress without putting the rest of your life on hold. Focus on what matters. Enjoy the rest.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'Tend',
    url: '/',
    title: 'Tend — goals, with intention.',
    description: 'Focus on what matters. Enjoy the rest.',
  },
  twitter: {
    card: 'summary',
    title: 'Tend — goals, with intention.',
    description: 'Focus on what matters. Enjoy the rest.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <PlanSessionProvider>{children}</PlanSessionProvider>
        <SiteAnalytics />
      </body>
    </html>
  );
}
