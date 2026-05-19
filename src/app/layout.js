import './globals.css';
import { ThemeProvider } from './components/ThemeProvider';
import { LanguageProvider } from '../lib/i18n';
import ClientShell from './components/ClientShell';

export const metadata = {
  title: 'beoneofus - The network for developers',
  description: 'Connect with developers worldwide. Broadcast your code. Join secure workspaces.',
icons: {
  icon: [
    { url: '/appIcon.png', sizes: '512x512', type: 'image/png' },
    { url: '/appIcon.png', sizes: '192x192', type: 'image/png' },
    { url: '/favicon.ico' },
  ],
  apple: [
    { url: '/apple-touch-icon.png' },
    { url: '/appIcon.png' },
  ],
},

  manifest: '/manifest.json',
  openGraph: {
    title: 'beoneofus',
    description: 'The network for developers. Connect, broadcast code, and join secure workspaces.',
    url: 'https://beoneofus.work',
    siteUrl: 'https://beoneofus.work',
    siteName: 'beoneofus',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'beoneofus',
    description: 'The network for developers.',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#111827',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      
      <body className="antialiased overflow-x-hidden overflow-y-auto" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <LanguageProvider>
            <ClientShell />
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
