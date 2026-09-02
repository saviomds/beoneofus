"use client";

/**
 * Small waving Rwanda flag on a short pole. Renders inline (drop it at the
 * start of a header/nav row); pure-CSS wave, GPU transforms only.
 * Authentic 2:3 flag: blue / yellow / green bands + the 24-ray golden sun.
 */
export default function RwandaFlag({ className = "" }) {
  return (
    <span aria-hidden="true" className={`rw-flag-wrap ${className}`} title="Rwanda">
      <span className="rw-flag-pole" />
      <span className="rw-flag">
        <svg viewBox="0 0 300 200" width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block" }}>
          <rect width="300" height="200" fill="#20603D" />
          <rect width="300" height="150" fill="#FAD201" />
          <rect width="300" height="100" fill="#00A1DE" />
          <g transform="translate(225 50)" fill="#E5BE01">
            <circle r="17" />
            {Array.from({ length: 24 }).map((_, i) => (
              <rect key={i} x="-1.6" y="-32" width="3.2" height="15" rx="1.6" transform={`rotate(${i * 15})`} />
            ))}
          </g>
        </svg>
      </span>

      <style>{`
        .rw-flag-wrap{
          display:inline-flex;align-items:flex-start;flex:0 0 auto;
          pointer-events:none;user-select:none;
          filter:drop-shadow(0 2px 4px rgba(0,0,0,.18));
        }
        .rw-flag-pole{
          width:2px;height:34px;border-radius:2px;flex:0 0 auto;
          background:linear-gradient(#e4e4e7,#a1a1aa);
        }
        .rw-flag{
          display:block;width:40px;height:27px;margin-top:1px;overflow:hidden;
          border-radius:1px 2px 2px 1px;transform-origin:left center;
          animation:rwWave 3.4s ease-in-out infinite;will-change:transform;
        }
        @keyframes rwWave{
          0%,100%{transform:perspective(80px) rotateY(0deg) skewY(0deg)}
          25%{transform:perspective(80px) rotateY(-14deg) skewY(1.1deg)}
          50%{transform:perspective(80px) rotateY(2deg) skewY(-.9deg)}
          75%{transform:perspective(80px) rotateY(-8deg) skewY(.5deg)}
        }
        @media (prefers-reduced-motion:reduce){.rw-flag{animation:none}}
      `}</style>
    </span>
  );
}
