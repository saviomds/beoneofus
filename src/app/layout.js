import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-white antialiased overflow-x-hidden overflow-y-auto">
        {children}
      </body>
    </html>
  );
}
