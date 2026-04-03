import './globals.css'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import RightSidebar from './components/RightSidebar'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased overflow-x-hidden">
        {/* Changed to w-full and removed max-w to hit the edges of the screen */}
        <div className="flex w-full min-h-screen">
          
          {/* 1. Left Sidebar - Fixed Width */}
          <div className="hidden md:block w-72 flex-shrink-0 border-r border-white/5">
            <Sidebar />
          </div>

          {/* 2. Center Column - Fills all remaining space */}
          <main className="flex-grow flex flex-col min-w-0 bg-black">
            <Header />
            <div className="flex-grow overflow-y-auto">
              {/* This inner div centers your feed content if you want a max-width, 
                  or remove 'max-w-3xl' to make the feed stretch completely */}
              <div className="max-w-3xl mx-auto w-full px-4 md:px-8 py-6">
                {children}
              </div>
            </div>
          </main>

          {/* 3. Right Sidebar - Fixed Width */}
          <div className="hidden lg:block w-[350px] flex-shrink-0 border-l border-white/5 bg-[#050505]">
            <RightSidebar />
          </div>

        </div>
      </body>
    </html>
  )
}