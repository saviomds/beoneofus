import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import Image from 'next/image';

export const revalidate = 60;

async function getMaintenanceInfo() {
  try {
    const supa = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data } = await supa
      .from('platform_settings')
      .select('key, value')
      .in('key', ['maintenance_message', 'platform_name', 'support_email']);

    const map = {};
    for (const row of data || []) map[row.key] = row.value;
    return {
      message:     map.maintenance_message || "We're doing a quick upgrade. Be back shortly!",
      name:        map.platform_name       || 'BeOneOfUs',
      supportEmail:map.support_email       || null,
    };
  } catch {
    return {
      message:     "We're doing a quick upgrade. Be back shortly!",
      name:        'BeOneOfUs',
      supportEmail: null,
    };
  }
}

export default async function MaintenancePage() {
  const { message, name, supportEmail } = await getMaintenanceInfo();

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-5 py-12 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(99,102,241,1) 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-violet-600/8 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md text-center space-y-8">

        {/* Logo */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-white/10 shadow-2xl bg-white/5">
            <Image src="/logo.svg" alt={name} width={56} height={56} unoptimized />
          </div>
        </div>

        {/* Animated gear */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shadow-xl">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-indigo-400 animate-spin" style={{ animationDuration: '8s' }}>
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            {/* Orbiting dot */}
            <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-indigo-400 shadow-lg shadow-indigo-500/50 animate-pulse" />
          </div>
        </div>

        {/* Status badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[11px] font-black text-amber-400 uppercase tracking-[0.2em]">Maintenance</span>
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-3">
          <h1 className="text-3xl font-black text-white tracking-tight">
            We'll be right back
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed max-w-sm mx-auto">
            {message}
          </p>
        </div>

        {/* Progress bar */}
        <div className="relative w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full animate-pulse" />
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 text-left space-y-4">
          <p className="text-[11px] font-black text-gray-600 uppercase tracking-[0.2em]">What's happening</p>
          <div className="space-y-3">
            {[
              { icon: "🔧", text: "Deploying platform updates" },
              { icon: "⚡", text: "Optimising performance" },
              { icon: "🔒", text: "Applying security patches" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="text-base">{icon}</span>
                <span className="text-sm text-gray-400">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Support link */}
        {supportEmail && (
          <p className="text-xs text-gray-600">
            Need urgent help?{' '}
            <a href={`mailto:${supportEmail}`} className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
              {supportEmail}
            </a>
          </p>
        )}

        {/* Admin bypass */}
        <p className="text-[11px] text-gray-700">
          Admin?{' '}
          <Link href="/auth" className="text-gray-500 hover:text-gray-300 font-bold transition-colors underline underline-offset-2">
            Sign in
          </Link>
          {' '}to access the dashboard.
        </p>
      </div>
    </div>
  );
}
