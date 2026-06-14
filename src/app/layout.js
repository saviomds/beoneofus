import './globals.css';
import { ThemeProvider } from './components/ThemeProvider';
import { LanguageProvider } from '../lib/i18n';
import ClientShell from './components/ClientShell';

export const metadata = {
  title: 'beoneofus - The network for developers',
  description: 'Connect with developers worldwide. Broadcast your code. Join secure workspaces.',
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
      <head>
        {/* Blocking theme script — must run before React hydration to prevent flash.
            Reads the same localStorage key next-themes writes ("theme"). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})();`,
          }}
        />
      </head>
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
