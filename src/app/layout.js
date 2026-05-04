import './globals.css';
import { ThemeProvider } from './components/ThemeProvider';
import { InstallPrompt } from './components/InstallPrompt';

export const metadata = {
  title: 'beoneofus - The network for developers',
  description: 'Connect with developers worldwide. Broadcast your code. Join secure workspaces.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
      { url: '/appIcon.png' },
    ],
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
      
      <body className="antialiased overflow-x-hidden overflow-y-auto" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <InstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
