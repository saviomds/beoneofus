'use client';

// Shared wrapper for viewing another user's profile in an overlay — replaces the
// near-identical portal+ProfileContent block copy-pasted into Connections, Header,
// Messages, Discover, Search and RightSidebar. Data flow is unchanged: it still
// renders <ProfileContent viewUserId={id} />.

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import { LoadingState } from './feedback';

const ProfileContent = dynamic(() => import('../../dash/content/ProfileContent'), {
  ssr: false,
  loading: () => <LoadingState label="Loading profile…" />,
});

export function ProfileModal({ userId, open = true, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open || !userId || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-start justify-center overflow-y-auto p-3 sm:p-6">
      <div className="fixed inset-0 bg-v2-ink/45 backdrop-blur-[2px] animate-in fade-in" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="User profile"
        className="relative z-10 w-full max-w-4xl my-2 sm:my-4 bg-v2-surface border border-v2-hairline rounded-v2-lg shadow-v2-overlay animate-in fade-in zoom-in-95 slide-in-from-bottom-2"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-20 p-2 rounded-v2-field bg-v2-surface/90 border border-v2-hairline text-v2-ink-faint hover:text-v2-ink hover:bg-v2-surface-2 transition-colors"
        >
          <X size={18} />
        </button>
        <div className="p-2 sm:p-5">
          <ProfileContent viewUserId={userId} />
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default ProfileModal;
