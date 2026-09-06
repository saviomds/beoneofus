import './globals.css';
import { Inter } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ThemeProvider } from './components/ThemeProvider';
import { LanguageProvider } from '../lib/i18n';
import ClientShell from './components/ClientShell';
import { OnlineUsersProvider } from './contexts/OnlineUsersContext';

// Self-hosted at build time (no runtime request to Google) — CSP `font-src 'self'` safe.
// Exposed as `--font-inter`; globals.css maps `--font-sans` onto it so every
// `font-sans` utility and the document default resolve to Inter.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: 'beoneofus — The Global Opportunity Ecosystem',
  description: 'An AI-powered network connecting individuals, businesses, governments, schools, healthcare providers, and NGOs — for jobs, mentorship, learning, coaching, and community, through one intelligent, verified graph.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },

  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'beoneofus',
    statusBarStyle: 'default',
  },
  openGraph: {
    title: 'beoneofus — The Global Opportunity Ecosystem',
    description: 'One AI-native network connecting individuals and institutions — for jobs, mentorship, learning, coaching, and community, through one verified graph.',
    url: 'https://beoneofus.work',
    siteUrl: 'https://beoneofus.work',
    siteName: 'beoneofus',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'beoneofus — The Global Opportunity Ecosystem',
    description: 'One AI-native network connecting individuals and institutions, through one verified graph.',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0A1024',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head />
      <body className="antialiased overflow-x-hidden overflow-y-auto" suppressHydrationWarning>
        {/* next-themes ThemeProvider injects its own blocking script for theme detection */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <LanguageProvider>
            <OnlineUsersProvider>
              <ClientShell />
              {children}
              <SpeedInsights />
            </OnlineUsersProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
