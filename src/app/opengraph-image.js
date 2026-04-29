import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const alt = 'beoneofus - The network for developers';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
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
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 80, fontWeight: 900, color: '#f3f4f6', letterSpacing: '-0.05em' }}>
          <span>beone</span><span style={{ color: '#3b82f6' }}>of</span><span>us</span>
        </div>
        <p style={{ fontSize: 32, color: '#9ca3af', marginTop: 20, fontWeight: 600 }}>
          The network for developers.
        </p>
      </div>
    ),
    { ...size }
  );
}