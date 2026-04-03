import { TrendingUp, MessageSquare, Star, Crown, CheckCircle2, Terminal, Cpu, Globe, Zap } from 'lucide-react';

const SectionHeader = ({ title, showBadge }) => (
  <div className="flex items-center gap-2 mb-4">
    <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-[2px]">
      {title}
    </h3>
    {showBadge && <CheckCircle2 size={12} className="text-brand-orange" />}
  </div>
);

export default function RightSidebar() {
  return (
  <aside className="w-full flex flex-col p-6 space-y-10 h-screen sticky top-0 overflow-y-auto">
      {/* 2. Trending Topics - Grid Style */}
      <div>
        <SectionHeader title="Trending Topics" />
        <div className="flex flex-wrap gap-2">
          {['nextjs', 'web3', 'tailwind', 'ai-agents', 'rust', 'react', 'supabase'].map((tag) => (
            <div key={tag} className="px-3 py-1.5 rounded-md bg-[#0D0D0D] border border-white/5 text-[12px] text-gray-400 hover:border-brand-orange/50 hover:text-white cursor-pointer transition-all">
              #{tag}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Official Channels - New Section */}
      <div>
        <SectionHeader title="Official Channels" showBadge />
        <div className="space-y-4">
          {[
            { name: 'VS Code', icon: Terminal, color: 'text-blue-400' },
            { name: 'React', icon: Cpu, color: 'text-cyan-400' },
            { name: 'Tailwind CSS', icon: Zap, color: 'text-sky-400' },
            { name: 'BeOneOfUs Global', icon: Globe, color: 'text-brand-orange' }
          ].map((channel) => (
            <div key={channel.name} className="flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-white/5 group-hover:bg-white/10 ${channel.color}`}>
                  <channel.icon size={18} />
                </div>
                <span className="text-sm font-medium text-gray-300 group-hover:text-white">{channel.name}</span>
              </div>
              <button className="text-[10px] font-bold text-gray-500 group-hover:text-brand-orange uppercase tracking-wider">
                + Follow
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Top Discussions - Compact List */}
      <div>
        <SectionHeader title="Top Discussions This Week" />
        <div className="space-y-6">
          {[
            { title: "Building a global SaaS with Next.js 15", comments: 124 },
            { title: "Why micro-soldering is back in 2026", comments: 89 }
          ].map((post, i) => (
            <div key={i} className="group cursor-pointer border-l-2 border-transparent hover:border-brand-orange pl-3 transition-all">
              <p className="text-sm text-gray-300 group-hover:text-white leading-snug">
                {post.title}
              </p>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-500 font-medium">
                <MessageSquare size={12} />
                <span>{post.comments} comments</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </aside>
  );
}