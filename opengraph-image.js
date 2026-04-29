import { ImageResponse } from 'next/og';
import { supabase } from '../../../supabaseClient';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image({ params }) {
  // Next.js 16 requires awaiting the params object
  const { username } = await params;

  // Fetch the specific user's data from Supabase
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, status, is_verified')
    .eq('username', username)
    .single();

  const displayName = profile?.username || username;
  const status = profile?.status || 'Active Node';

  return new ImageResponse(
    (
      <div
        style={{
          background: '#111827', // dark-gray-900 to match your theme
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 60, fontWeight: 900, color: '#f3f4f6', letterSpacing: '-0.05em', marginBottom: 40 }}>
          <span>beone</span><span style={{ color: '#3b82f6' }}>of</span><span>us</span>
        </div>
        
        {/* Dynamic User Card */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '40px 80px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 48, fontWeight: 'bold', color: '#ffffff', display: 'flex', alignItems: 'center' }}>
            @{displayName} {profile?.is_verified ? '✓' : ''}
          </div>
          <div style={{ fontSize: 24, color: '#10b981', marginTop: 15, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {status}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}