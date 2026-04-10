import './globals.css'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  )
}