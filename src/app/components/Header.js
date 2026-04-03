import { Search } from 'lucide-react';

export default function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-10">
      {/* Left: Search Bar */}
      <div className="relative flex-1 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-500" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-white/10 rounded-full bg-[#0D0D0D] text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-transparent transition-all"
          placeholder="Search projects, snippets, or people..."
        />
      </div>

      {/* Right: Nav Links */}
      <nav className="flex items-center gap-8 ml-8">
        <a href="#" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Discuss</a>
        <a href="#" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Discover</a>
      </nav>
    </header>
  );
}