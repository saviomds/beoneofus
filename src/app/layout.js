import './globals.css';
import { ThemeProvider } from './components/ThemeProvider';

export const metadata = {
  title: 'beoneofus - The network for developers',
  description: 'Connect with developers worldwide. Broadcast your code. Join secure workspaces.',
  openGraph: {
    title: 'beoneofus',
    description: 'The network for developers. Connect, broadcast code, and join secure workspaces.',
    url: 'https://beoneofus.com',
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
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased overflow-x-hidden overflow-y-auto">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
