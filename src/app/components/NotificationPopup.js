'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { X, MessageSquare, Bell } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function NotificationPopup() {
  const [userId, setUserId]   = useState(null);
  const [queue, setQueue]     = useState([]);
  const [current, setCurrent] = useState(null);
  const [visible, setVisible] = useState(false);

  const pathname    = usePathname();
  const pathnameRef = useRef(pathname);
  const timerRef    = useRef(null);
  const router      = useRouter();

  // Keep pathnameRef in sync so subscription callbacks see the latest route
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  // ── Resolve authenticated user ──────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Push item onto the queue ─────────────────────────────────────────────
  const enqueue = useCallback((item) => {
    setQueue(q => [...q, item]);
  }, []);

  // ── Dequeue: show one at a time ──────────────────────────────────────────
  useEffect(() => {
    if (current || queue.length === 0) return;
    const [next, ...rest] = queue;
    setCurrent(next);
    setQueue(rest);
    // Micro-delay so CSS transition plays from invisible state
    requestAnimationFrame(() => setVisible(true));

    timerRef.current = setTimeout(dismissCurrent, 4500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, queue]);

  const dismissCurrent = useCallback(() => {
    clearTimeout(timerRef.current);
    setVisible(false);
    setTimeout(() => setCurrent(null), 320);
  }, []);

  // ── Real-time subscriptions ──────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const handleMessage = async (payload) => {
      if (pathnameRef.current?.includes('/messages')) return;
      const msg = payload.new;
      if (!msg || msg.sender_id === userId) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', msg.sender_id)
        .maybeSingle();

      enqueue({
        id:     `msg-${msg.id}`,
        type:   'message',
        title:  profile?.username || 'New message',
        body:   msg.text || (msg.image_url ? '📷 Sent a photo' : 'New message'),
        avatar: profile?.avatar_url || null,
        link:   '/dash/messages',
      });
    };

    const handleNotification = async (payload) => {
      if (pathnameRef.current?.includes('/notifications')) return;
      const notif = payload.new;
      if (!notif) return;

      let actorName   = 'Someone';
      let actorAvatar = null;
      if (notif.actor_id) {
        const { data: actor } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', notif.actor_id)
          .maybeSingle();
        actorName   = actor?.username || actorName;
        actorAvatar = actor?.avatar_url || null;
      }

      const bodyMap = {
        like:               'liked your post',
        comment:            'commented on your post',
        message:            'sent you a message',
        handshake:          'wants to shake hands',
        connection_request: 'wants to connect with you',
        group_invite:       'invited you to a group',
        group_join_request: 'wants to join your group',
        partnership_update: 'updated a partnership',
      };

      enqueue({
        id:     `notif-${notif.id}`,
        type:   'notification',
        title:  actorName,
        body:   notif.content || bodyMap[notif.type] || 'sent you a notification',
        avatar: actorAvatar,
        link:   notif.link || '/dash/notifications',
      });
    };

    const channel = supabase
      .channel(`popup-${userId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        filter: `receiver_id=eq.${userId}`,
      }, handleMessage)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `receiver_id=eq.${userId}`,
      }, handleNotification)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, enqueue]);

  if (!current) return null;

  const isMsg = current.type === 'message';

  return (
    /* Mobile: slides down from below the top-bar (top-14 = 56 px)
       Desktop: fixed to top-right corner                          */
    <div
      className={`
        fixed z-[300] left-0 right-0 top-14 flex justify-center px-3 pointer-events-none
        md:left-auto md:right-4 md:top-4 md:w-80
        transition-all duration-300 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'}
      `}
    >
      <div
        role="alert"
        aria-live="assertive"
        onClick={() => { router.push(current.link); dismissCurrent(); }}
        className="
          pointer-events-auto w-full max-w-sm
          bg-white/95 dark:bg-gray-900/95
          backdrop-blur-xl
          border border-gray-200/80 dark:border-gray-700/60
          rounded-2xl shadow-2xl shadow-black/25
          flex items-center gap-3 p-3
          cursor-pointer select-none
          active:scale-[0.97] transition-transform duration-100
        "
      >
        {/* ── Avatar ─────────────────────────────────────────────────── */}
        <div className="relative shrink-0 w-11 h-11 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
          {current.avatar ? (
            <Image src={current.avatar} alt={current.title} fill sizes="44px" className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-base font-black text-gray-500 dark:text-gray-400">
              {current.title?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          {/* Small type badge */}
          <div className={`
            absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900
            ${isMsg ? 'bg-blue-500' : 'bg-violet-500'}
          `}>
            {isMsg
              ? <MessageSquare size={9} className="text-white" />
              : <Bell size={9} className="text-white" />}
          </div>
        </div>

        {/* ── Text ───────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">
            {current.title}
          </p>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate mt-0.5 leading-tight">
            {current.body}
          </p>
        </div>

        {/* ── Dismiss ────────────────────────────────────────────────── */}
        <button
          onClick={(e) => { e.stopPropagation(); dismissCurrent(); }}
          aria-label="Dismiss"
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      {/* Progress bar — shows how long until auto-dismiss */}
      <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-gray-100 dark:bg-gray-800 rounded-b-2xl overflow-hidden pointer-events-none">
        <div
          className={`h-full ${isMsg ? 'bg-blue-400' : 'bg-violet-400'} rounded-full`}
          style={{ animation: visible ? 'shrink-bar 4.5s linear forwards' : 'none' }}
        />
      </div>

    </div>
  );
}
