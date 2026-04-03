import { Code2, Image as ImageIcon, ChevronDown, Send } from 'lucide-react';

export default function NewPost() {
  return (
    <div className="bg-[#0D0D0D] border border-white/10 rounded-xl p-4 mb-6">
      {/* Input Area */}
      <div className="flex flex-col gap-4">
        <textarea
          placeholder="What's the latest code, TechNinja?"
          className="w-full bg-transparent border-none focus:ring-0 text-gray-200 placeholder-gray-600 resize-none min-h-[80px] text-lg"
        />
        
        {/* Bottom Actions Row */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div className="flex items-center gap-4 text-gray-500">
            {/* Code Icon */}
            <button className="hover:text-brand-orange transition-colors flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/5">
              <Code2 size={20} />
            </button>
            
            {/* Image Icon */}
            <button className="hover:text-brand-orange transition-colors flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/5">
              <ImageIcon size={20} />
            </button>

            {/* Dropdown Menu (More) */}
            <button className="hover:text-brand-orange transition-colors flex items-center gap-1 text-sm px-2 py-1 rounded-md hover:bg-white/5">
              <span>More</span>
              <ChevronDown size={14} />
            </button>
          </div>

          {/* Post Button */}
          <button className="bg-brand-orange hover:bg-orange-600 text-black p-2 rounded-lg transition-transform active:scale-95">
            <Send size={18} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}