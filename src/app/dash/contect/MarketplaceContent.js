"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  ShoppingBag, Award, Shield, Copy, Check, Share2, Plus, Search,
  Loader2, AlertTriangle, Crown, BadgeCheck, X,
  Tag, CheckCircle2, Library, ArrowRight, BookOpen, Sparkles,
  CreditCard, ExternalLink, Eye, EyeOff, Pencil, Trash2, Store,
  Handshake,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import PartnershipsContent from "./PartnershipsContent";

const CATEGORIES = ["All", "Course", "Credential", "Service", "Template", "Asset"];

const CATEGORY_BADGE = {
  Course:     "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  Credential: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  Service:    "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  Template:   "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
  Asset:      "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400",
};

const CATEGORY_ICON = {
  Course: "📚", Credential: "🏅", Service: "🛠", Template: "📄", Asset: "💎",
};

const CRED_TYPE_BADGE = {
  Certificate: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  Badge:       "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  Achievement: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
};

function truncateHash(hash) {
  if (!hash || hash.length <= 20) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

const inputCls = "w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all";

function generateHash(userId, credId) {
  const raw = btoa(`${userId}${credId}${Date.now()}`).replace(/[^a-z0-9]/gi, '').toLowerCase();
  const extra = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return (raw + extra).slice(0, 64);
}

/* ── Toast Popup Card ─────────────────────────────── */
function ToastCard({ item, onClose, onViewLibrary }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-[300] w-80 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden">
        <div className="h-0.5 bg-gray-100 dark:bg-gray-800">
          <div className="h-full bg-blue-500 animate-[shrink_5s_linear_forwards]" style={{ transformOrigin: 'left' }} />
        </div>
        <div className="p-4 flex gap-3">
          <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-gray-100 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
            {item.image_url ? (
              <Image src={item.image_url} alt={item.title} fill sizes="56px" className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">
                {CATEGORY_ICON[item.category] || '📦'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-widest text-green-600 dark:text-green-400">Added to Library</span>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0">
                <X size={14} />
              </button>
            </div>
            <p className="text-xs font-bold text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight mb-2">{item.title}</p>
            <button onClick={onViewLibrary} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:gap-2 transition-all">
              View Library <ArrowRight size={10} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Credential Card ──────────────────────────────── */
function CredentialCard({ cred, onShare, onListTrade, showActions = true }) {
  const [copied, setCopied] = useState(false);

  const handleCopyHash = async () => {
    await navigator.clipboard.writeText(cred.blockchain_hash || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-2xl p-5 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/30 dark:via-yellow-950/30 dark:to-orange-950/20 border-2 border-amber-200 dark:border-amber-800/50 shadow-md hover:shadow-lg transition-all">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400/5 to-yellow-400/10 pointer-events-none" />
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-gray-900 dark:text-gray-100 text-base leading-tight truncate">{cred.title}</h3>
          {cred.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{cred.description}</p>
          )}
        </div>
        <span className={`shrink-0 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${CRED_TYPE_BADGE[cred.credential_type] || CRED_TYPE_BADGE.Certificate}`}>
          {cred.credential_type || "Certificate"}
        </span>
      </div>

      {cred.issuer && (
        <div className="flex items-center gap-2 mb-3">
          <div className="relative w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700">
            {cred.issuer.avatar_url ? (
              <Image src={cred.issuer.avatar_url} alt="issuer" fill sizes="28px" className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xs uppercase">
                {cred.issuer.username?.[0]}
              </div>
            )}
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1">
            @{cred.issuer.username}
            {cred.issuer.is_verified && <BadgeCheck size={12} className="text-blue-500 shrink-0" fill="currentColor" stroke="white" />}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
            {cred.issued_at ? new Date(cred.issued_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : ""}
          </span>
        </div>
      )}

      {cred.blockchain_hash && (
        <div className="bg-white/70 dark:bg-gray-900/50 rounded-xl px-3 py-2 flex items-center gap-2 mb-3 border border-amber-100 dark:border-amber-900/30">
          <span className="font-mono text-[10px] text-gray-600 dark:text-gray-400 flex-1 truncate">{truncateHash(cred.blockchain_hash)}</span>
          <button onClick={handleCopyHash} className="shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 px-2.5 py-1 rounded-lg">
          <Shield size={11} /> Verified on Chain
        </span>
        {showActions && onShare && (
          <button
            onClick={() => onShare(cred.blockchain_hash)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-gray-900 px-2.5 py-1 rounded-lg transition-all"
          >
            <Share2 size={11} /> Share
          </button>
        )}
        {showActions && cred.is_tradeable && onListTrade && (
          <button
            onClick={() => onListTrade(cred)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 px-2.5 py-1 rounded-lg transition-all"
          >
            <Tag size={11} /> List for Trade
          </button>
        )}
        {cred.expires_at && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
            Expires {new Date(cred.expires_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Listing Detail Modal ─────────────────────────── */
function ListingDetailModal({ listing, currentUserId, userEmail, isPremium, inLibrary, onClose, onAddToLibrary }) {
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  const isPremiumFree = isPremium && listing.category === 'Course' && listing.price > 0;
  const effectivePrice = isPremiumFree ? 0 : (listing.price || 0);
  const isFree = effectivePrice === 0;

  const handleGet = async () => {
    if (!currentUserId) { setPayError('Sign in to continue.'); return; }
    if (inLibrary) return;

    setPayError('');

    if (isFree) {
      setPaying(true);
      try {
        const { error } = await supabase.from('user_library').insert({ user_id: currentUserId, listing_id: listing.id });
        if (!error) { onAddToLibrary(listing); onClose(); }
        else setPayError(error.message);
      } finally {
        setPaying(false);
      }
      return;
    }

    /* Paid flow via Paystack */
    if (typeof window === 'undefined' || !window.PaystackPop) {
      setPayError('Payment service loading — try again in a moment.');
      return;
    }

    setPaying(true);
    try {
      const initRes = await fetch('/api/paystack/marketplace/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, email: userEmail, listingId: listing.id, priceUsd: effectivePrice }),
      });
      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error || 'Failed to start payment');

      const handler = window.PaystackPop.setup({
        key:      process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email:    userEmail,
        amount:   initData.amount,
        currency: initData.currency,
        ref:      initData.reference,
        label:    listing.title,
        callback: (response) => {
          (async () => {
            try {
              const verifyRes = await fetch('/api/paystack/marketplace/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reference: response.reference, userId: currentUserId, listingId: listing.id }),
              });
              const verifyData = await verifyRes.json();
              if (verifyRes.ok) {
                onAddToLibrary(listing);
                onClose();
              } else {
                setPayError(verifyData.error || 'Verification failed. Contact support.');
              }
            } catch {
              setPayError('Verification failed. Contact support.');
            } finally {
              setPaying(false);
            }
          })();
        },
        onClose: () => setPaying(false),
      });
      handler.openIframe();
    } catch (err) {
      setPayError(err.message);
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">

        {/* Image header */}
        <div className="relative w-full h-48 sm:h-56 shrink-0 bg-gray-100 dark:bg-gray-800">
          <Image
            src={listing.image_url || `https://picsum.photos/seed/${listing.id}/800/400`}
            alt={listing.title} fill sizes="100vw" className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm">
            <X size={15} />
          </button>
          <div className="absolute bottom-3 left-3 right-14 flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${CATEGORY_BADGE[listing.category] || CATEGORY_BADGE.Asset}`}>
              {CATEGORY_ICON[listing.category]} {listing.category}
            </span>
            {inLibrary && (
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-green-500 text-white flex items-center gap-1">
                <Check size={9} /> Owned
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-black text-gray-900 dark:text-gray-100 text-xl leading-tight flex-1">{listing.title}</h2>
            <div className="text-right shrink-0">
              {inLibrary ? (
                <span className="text-sm font-black text-green-600 dark:text-green-400">In Library</span>
              ) : isPremiumFree ? (
                <div>
                  <span className="text-sm font-black text-amber-600 dark:text-amber-400">Free</span>
                  <p className="text-[10px] text-amber-500/80">with Premium</p>
                </div>
              ) : isFree ? (
                <span className="text-sm font-black text-green-600 dark:text-green-400">Free</span>
              ) : (
                <div>
                  <span className="text-xl font-black text-gray-900 dark:text-gray-100">${listing.price}</span>
                  {listing.category === 'Course' && !isPremium && (
                    <p className="text-[10px] text-amber-500">Premium: Free</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Seller + stats */}
          {listing.profiles && (
            <div className="flex items-center gap-2">
              <div className="relative w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0">
                {listing.profiles.avatar_url ? (
                  <Image src={listing.profiles.avatar_url} alt="seller" fill sizes="24px" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-gray-400 uppercase">{listing.profiles.username?.[0]}</div>
                )}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                @{listing.profiles.username}
                {listing.profiles.is_verified && <BadgeCheck size={11} className="text-blue-500" fill="currentColor" stroke="white" />}
                {listing.profiles.is_premium && <Crown size={10} className="text-amber-500" />}
              </span>
              {listing.purchases > 0 && (
                <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">
                  {listing.purchases} {listing.category === 'Course' ? 'enrolled' : 'sold'}
                </span>
              )}
            </div>
          )}

          {/* Description */}
          {listing.description && (
            <div
              className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1 [&_p]:mb-2 [&_strong]:font-bold"
              dangerouslySetInnerHTML={{ __html: listing.description }}
            />
          )}

          {/* Tags */}
          {listing.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {listing.tags.map(tag => (
                <span key={tag} className="text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700">{tag}</span>
              ))}
            </div>
          )}

          {/* Premium upsell for non-premium users on paid courses */}
          {!isPremium && listing.category === 'Course' && listing.price > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3 flex items-start gap-2.5">
              <Crown size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Get every course free with Premium</p>
                <p className="text-[10px] text-amber-600/80 dark:text-amber-500/70">All courses are included in a Premium subscription at $9.99/mo.</p>
              </div>
            </div>
          )}

          {payError && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl px-3 py-2">
              <AlertTriangle size={13} /> {payError}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="shrink-0 p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          {inLibrary ? (
            <button onClick={onClose} className="w-full flex items-center justify-center gap-2 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50 font-black text-sm rounded-xl">
              <Check size={16} /> Already in your library
            </button>
          ) : !currentUserId ? (
            <p className="text-center text-sm text-gray-400 py-1">Sign in to get this item.</p>
          ) : (
            <button
              onClick={handleGet}
              disabled={paying}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-black text-sm rounded-xl hover:bg-blue-600 dark:hover:bg-blue-600 dark:hover:text-white transition-all active:scale-95 disabled:opacity-60"
            >
              {paying
                ? <><Loader2 size={16} className="animate-spin" /> Processing...</>
                : isFree || isPremiumFree
                  ? <><BookOpen size={16} /> Get Free</>
                  : <><CreditCard size={16} /> Pay ${effectivePrice} via Paystack</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Library Item Modal ───────────────────────────── */
function LibraryItemModal({ item, onClose }) {
  const { listing, acquired_at } = item;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">

        <div className="relative w-full h-44 shrink-0 bg-gray-100 dark:bg-gray-800">
          <Image
            src={listing.image_url || `https://picsum.photos/seed/${listing.id}/600/300`}
            alt={listing.title} fill sizes="100vw" className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm">
            <X size={15} />
          </button>
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${CATEGORY_BADGE[listing.category] || CATEGORY_BADGE.Asset}`}>
              {CATEGORY_ICON[listing.category]} {listing.category}
            </span>
            <span className="text-[9px] font-black uppercase bg-green-500 text-white px-2 py-1 rounded-lg flex items-center gap-1">
              <Check size={9} /> Owned
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <h2 className="font-black text-gray-900 dark:text-gray-100 text-lg leading-tight">{listing.title}</h2>
          {listing.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{listing.description}</p>
          )}
          {listing.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {listing.tags.map(tag => (
                <span key={tag} className="text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-md">{tag}</span>
              ))}
            </div>
          )}
          {listing.profiles && (
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500">
              by @{listing.profiles.username}
              {listing.profiles.is_verified && <BadgeCheck size={9} className="text-blue-500" fill="currentColor" stroke="white" />}
            </div>
          )}
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            Added {new Date(acquired_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <div className="shrink-0 p-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
          {listing.category === 'Course' ? (
            <a
              href="/Academy"
              className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-black text-sm rounded-xl hover:bg-blue-600 transition-all"
            >
              <BookOpen size={16} /> Open in Academy
            </a>
          ) : (
            <button onClick={onClose} className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Credential Detail Modal ──────────────────────── */
function CredentialDetailModal({ cred, onClose }) {
  const [urlCopied, setUrlCopied] = useState(false);

  const handleShare = async (hash) => {
    const url = `${window.location.origin}/verify/${hash}`;
    await navigator.clipboard.writeText(url);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <h3 className="font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Award size={16} className="text-amber-500" /> Credential Detail
          </h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <CredentialCard cred={cred} onShare={handleShare} onListTrade={() => alert('Trading coming soon!')} showActions />
          {cred.blockchain_hash && (
            <a
              href={`/verify/${cred.blockchain_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl transition-all"
            >
              <ExternalLink size={14} /> Open Public Verification Page
            </a>
          )}
          {urlCopied && (
            <p className="text-center text-xs text-green-600 dark:text-green-400 font-bold">Verification link copied!</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Browse Tab ───────────────────────────────────── */
function BrowseTab({ currentUserId, libraryIds, isPremium, onAddToLibrary, onSelectListing }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [authError, setAuthError] = useState(false);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select('id, title, description, category, price, currency, image_url, tags, purchases, created_at, profiles:seller_id(id, username, avatar_url, is_verified, is_premium)')
      .eq('is_active', true)
      .order('purchases', { ascending: false });
    if (!error && data) {
      // Deduplicate listings by title + category (case-insensitive)
      // Keep the first occurrence (highest purchases due to ordering)
      const seen = new Set();
      const deduplicated = data.filter(listing => {
        const key = `${listing.title.toLowerCase().trim()}|${listing.category.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setListings(deduplicated);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchListings();
    const ch = supabase.channel('mkt-listings-browse')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'marketplace_listings' }, () => fetchListings())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'marketplace_listings' }, () => fetchListings())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'marketplace_listings' }, (payload) => {
        setListings(prev => prev.filter(l => l.id !== payload.old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchListings]);

  const filtered = activeFilter === "All" ? listings : listings.filter(l => l.category === activeFilter);

  const handleQuickGet = async (e, listing) => {
    e.stopPropagation();
    if (!currentUserId) { setAuthError(true); setTimeout(() => setAuthError(false), 3000); return; }
    if (libraryIds.has(listing.id)) return;
    const { error } = await supabase.from('user_library').insert({ user_id: currentUserId, listing_id: listing.id });
    if (!error) onAddToLibrary(listing);
  };

  return (
    <div className="space-y-5">
      {authError && (
        <div className="flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl px-4 py-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <AlertTriangle size={14} className="shrink-0" /> Sign in to add items to your library.
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={`text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all ${
              activeFilter === cat
                ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-transparent"
                : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
            }`}
          >
            {CATEGORY_ICON[cat] || ''} {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 animate-pulse">
              <div className="w-full h-36 bg-gray-200 dark:bg-gray-800 rounded-xl mb-3" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingBag size={40} className="text-gray-300 dark:text-gray-700 mb-4" />
          <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-1">Nothing here yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Check back soon or be the first to list something.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(listing => {
            const inLibrary = libraryIds.has(listing.id);
            const isPremiumFree = isPremium && listing.category === 'Course' && listing.price > 0;
            const effectivePrice = isPremiumFree ? 0 : (listing.price || 0);
            const isFree = effectivePrice === 0;

            return (
              <div
                key={listing.id}
                onClick={() => onSelectListing(listing)}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg transition-all flex flex-col overflow-hidden group cursor-pointer"
              >
                <div className="relative w-full h-40 bg-gray-100 dark:bg-gray-800 shrink-0 overflow-hidden">
                  <Image
                    src={listing.image_url || `https://picsum.photos/seed/${listing.id}/400/200`}
                    alt={listing.title} fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 left-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${CATEGORY_BADGE[listing.category] || CATEGORY_BADGE.Asset}`}>
                      {listing.category || "Asset"}
                    </span>
                  </div>
                  {inLibrary && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg flex items-center gap-1">
                      <Check size={9} /> Owned
                    </div>
                  )}
                  {isPremiumFree && !inLibrary && (
                    <div className="absolute top-2 right-2 bg-amber-400 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg flex items-center gap-1">
                      <Crown size={9} /> Free
                    </div>
                  )}
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-black text-gray-900 dark:text-gray-100 text-sm leading-tight mb-1 line-clamp-2">{listing.title}</h3>
                  {listing.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 flex-1">{listing.description}</p>
                  )}

                  {listing.profiles && (
                    <div className="flex items-center gap-1.5 mb-3">
                      <div className="relative w-5 h-5 rounded-md bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700">
                        {listing.profiles.avatar_url ? (
                          <Image src={listing.profiles.avatar_url} alt="seller" fill sizes="20px" className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-gray-400 uppercase">{listing.profiles.username?.[0]}</div>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate flex items-center gap-0.5">
                        @{listing.profiles.username}
                        {listing.profiles.is_verified && <BadgeCheck size={10} className="text-blue-500 shrink-0" fill="currentColor" stroke="white" />}
                        {listing.profiles.is_premium && <Crown size={10} className="text-amber-500 shrink-0" />}
                      </span>
                      {listing.purchases > 0 && (
                        <span className="ml-auto text-[9px] text-gray-400 dark:text-gray-500 shrink-0">{listing.purchases} sold</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="font-black text-gray-900 dark:text-gray-100 text-sm">
                      {isFree || isPremiumFree ? (
                        <span className="text-green-600 dark:text-green-400">{isPremiumFree ? '★ Free' : 'Free'}</span>
                      ) : `$${listing.price}`}
                    </span>
                    <button
                      onClick={e => {
                        if (inLibrary) return;
                        if (isFree) { handleQuickGet(e, listing); }
                        else { e.stopPropagation(); onSelectListing(listing); }
                      }}
                      disabled={inLibrary}
                      className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all active:scale-95 ${
                        inLibrary
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 cursor-default'
                          : isFree || isPremiumFree
                            ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-blue-600 dark:hover:bg-blue-500 dark:hover:text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {inLibrary
                        ? <><Check size={12} /> Owned</>
                        : isFree || isPremiumFree
                          ? 'Get Free'
                          : <><CreditCard size={11} /> ${listing.price}</>
                      }
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── My Library Tab ───────────────────────────────── */
function MyLibraryTab({ currentUserId, onSelectItem }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) { setLoading(false); return; }
    const fetchItems = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_library')
        .select('acquired_at, listing:listing_id(id, title, description, category, price, currency, image_url, tags, profiles:seller_id(username, avatar_url, is_verified, is_premium))')
        .eq('user_id', currentUserId)
        .order('acquired_at', { ascending: false });
      if (!error && data) setItems(data.filter(d => d.listing));
      setLoading(false);
    };
    fetchItems();
  }, [currentUserId]);

  if (!currentUserId) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Library size={40} className="text-gray-300 dark:text-gray-700 mb-4" />
      <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-1">Sign in to see your library</h3>
    </div>
  );

  if (loading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1,2,3].map(i => (
        <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 animate-pulse">
          <div className="w-full h-36 bg-gray-200 dark:bg-gray-800 rounded-xl mb-3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-2" />
        </div>
      ))}
    </div>
  );

  if (items.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <BookOpen size={48} className="text-gray-300 dark:text-gray-700 mb-4" />
      <h3 className="font-bold text-gray-700 dark:text-gray-300 text-lg mb-2">Your library is empty</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
        Browse the marketplace and click <strong>Get</strong> on any course, template, or asset to add it here.
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-blue-500" />
        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{items.length} item{items.length !== 1 ? 's' : ''} in your library</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div
            key={item.listing.id}
            onClick={() => onSelectItem(item)}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all group cursor-pointer"
          >
            <div className="relative w-full h-36 bg-gray-100 dark:bg-gray-800 shrink-0 overflow-hidden">
              <Image
                src={item.listing.image_url || `https://picsum.photos/seed/${item.listing.id}/400/200`}
                alt={item.listing.title} fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-2 left-2">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${CATEGORY_BADGE[item.listing.category] || CATEGORY_BADGE.Asset}`}>
                  {item.listing.category}
                </span>
              </div>
              <div className="absolute top-2 right-2 bg-green-500 text-white text-[9px] font-black uppercase px-2 py-1 rounded-lg flex items-center gap-1">
                <Check size={9} /> Owned
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-black text-gray-900 dark:text-gray-100 text-sm leading-tight mb-1 line-clamp-2">{item.listing.title}</h3>
              {item.listing.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 flex-1">{item.listing.description}</p>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                {item.listing.profiles && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                    @{item.listing.profiles.username}
                    {item.listing.profiles.is_verified && <BadgeCheck size={9} className="text-blue-500" fill="currentColor" stroke="white" />}
                  </span>
                )}
                <span className="text-[9px] text-gray-400 dark:text-gray-500 ml-auto">
                  Added {new Date(item.acquired_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── My Credentials Tab ───────────────────────────── */
function MyCredentialsTab({ currentUserId, onSelectCred }) {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) { setLoading(false); return; }
    const fetchCreds = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('credentials')
        .select('id, title, description, credential_type, blockchain_hash, issued_at, expires_at, is_tradeable, price, issuer:issuer_id(username, avatar_url, is_verified), metadata')
        .eq('user_id', currentUserId)
        .order('issued_at', { ascending: false });
      if (!error && data) setCredentials(data);
      setLoading(false);
    };
    fetchCreds();
  }, [currentUserId]);

  if (!currentUserId) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Award size={40} className="text-gray-300 dark:text-gray-700 mb-4" />
      <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-1">Sign in to view your credentials</h3>
    </div>
  );

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1,2,3].map(i => (
        <div key={i} className="rounded-2xl border-2 border-amber-200 dark:border-amber-800/50 p-5 animate-pulse bg-amber-50/50 dark:bg-amber-950/20">
          <div className="h-5 bg-amber-200 dark:bg-amber-900/30 rounded w-2/3 mb-3" />
          <div className="h-3 bg-amber-100 dark:bg-amber-900/20 rounded w-full mb-2" />
        </div>
      ))}
    </div>
  );

  if (credentials.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Award size={40} className="text-gray-300 dark:text-gray-700 mb-4" />
      <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-1">No credentials yet</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">Complete achievements or receive credentials from others.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {credentials.map(cred => (
        <div key={cred.id} onClick={() => onSelectCred(cred)} className="cursor-pointer">
          <CredentialCard cred={cred} showActions={false} />
        </div>
      ))}
    </div>
  );
}

/* ── Issue Credential Tab ─────────────────────────── */
function IssueCredentialTab({ currentUserId, currentProfile }) {
  const canIssue = currentProfile?.role === 'founder' || currentProfile?.is_admin === true;
  const emptyForm = { title: '', description: '', credential_type: 'Certificate', is_tradeable: false, price: '', expires_at: '' };
  const [form, setForm] = useState(emptyForm);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientResults, setRecipientResults] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');

  const searchRecipients = useCallback(async (q) => {
    if (!q || q.length < 2) { setRecipientResults([]); return; }
    const { data } = await supabase.from('profiles').select('id, username, avatar_url, is_verified').ilike('username', `%${q}%`).limit(6);
    if (data) setRecipientResults(data);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchRecipients(recipientSearch), 300);
    return () => clearTimeout(t);
  }, [recipientSearch, searchRecipients]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRecipient) { setError('Select a recipient.'); return; }
    setSubmitting(true); setError('');
    try {
      const { data: newCred, error: insertError } = await supabase
        .from('credentials')
        .insert({ title: form.title, description: form.description, credential_type: form.credential_type, user_id: selectedRecipient.id, issuer_id: currentUserId, is_tradeable: form.is_tradeable, price: form.price ? parseFloat(form.price) : null, expires_at: form.expires_at || null, issued_at: new Date().toISOString(), blockchain_hash: '' })
        .select('id').single();
      if (insertError) throw insertError;
      const hash = generateHash(selectedRecipient.id, newCred.id);
      await supabase.from('credentials').update({ blockchain_hash: hash }).eq('id', newCred.id);
      setSuccess({ hash, title: form.title, recipient: selectedRecipient.username });
      setForm(emptyForm); setSelectedRecipient(null); setRecipientSearch('');
    } catch (err) {
      setError(err.message || 'Failed to issue credential.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canIssue) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Shield size={40} className="text-gray-300 dark:text-gray-700 mb-4" />
      <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-1">Access Restricted</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">Only founders and admins can issue credentials.</p>
    </div>
  );

  if (success) return (
    <div className="max-w-md mx-auto flex flex-col items-center text-center gap-4 py-8">
      <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 flex items-center justify-center">
        <CheckCircle2 size={32} className="text-green-500" />
      </div>
      <h3 className="font-black text-gray-900 dark:text-gray-100 text-lg">Credential Issued!</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        <strong>"{success.title}"</strong> was issued to <strong>@{success.recipient}</strong>.
      </p>
      <div className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-left">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Blockchain Hash</p>
        <p className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all">{success.hash}</p>
      </div>
      <button onClick={() => setSuccess(null)} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">Issue Another</button>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="font-black text-gray-900 dark:text-gray-100 text-base">Issue a Credential</h2>
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl px-3 py-2">
            <AlertTriangle size={14} /> {error}
          </div>
        )}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Title *</label>
          <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Full-Stack Developer Certificate" className={inputCls} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Description</label>
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe what this credential represents..." rows={3} className={inputCls + " resize-none"} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Type *</label>
          <select value={form.credential_type} onChange={e => setForm(p => ({ ...p, credential_type: e.target.value }))} className={inputCls}>
            <option value="Certificate">Certificate</option>
            <option value="Badge">Badge</option>
            <option value="Achievement">Achievement</option>
          </select>
        </div>
        <div className="space-y-1 relative">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Recipient *</label>
          {selectedRecipient ? (
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl px-3 py-2.5">
              <div className="relative w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0">
                {selectedRecipient.avatar_url ? <Image src={selectedRecipient.avatar_url} alt="recipient" fill sizes="24px" className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-gray-400 uppercase">{selectedRecipient.username?.[0]}</div>}
              </div>
              <span className="text-sm font-bold text-blue-700 dark:text-blue-300 flex-1">@{selectedRecipient.username}</span>
              <button type="button" onClick={() => setSelectedRecipient(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={recipientSearch} onChange={e => setRecipientSearch(e.target.value)} placeholder="Search by username..." className={inputCls + " pl-8"} />
              </div>
              {recipientResults.length > 0 && (
                <div className="absolute z-20 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg mt-1 overflow-hidden">
                  {recipientResults.map(u => (
                    <button key={u.id} type="button" onClick={() => { setSelectedRecipient(u); setRecipientSearch(''); setRecipientResults([]); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
                      <div className="relative w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700">
                        {u.avatar_url ? <Image src={u.avatar_url} alt="user" fill sizes="28px" className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-gray-400 uppercase">{u.username?.[0]}</div>}
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1">@{u.username}{u.is_verified && <BadgeCheck size={12} className="text-blue-500" fill="currentColor" stroke="white" />}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setForm(p => ({ ...p, is_tradeable: !p.is_tradeable }))} className={`relative w-9 h-5 rounded-full transition-colors ${form.is_tradeable ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_tradeable ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Tradeable</label>
          {form.is_tradeable && <input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="Price (USD)" className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 transition-all" />}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Expires (optional)</label>
          <input type="date" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} className={inputCls} />
        </div>
        <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-black text-sm py-3 rounded-xl hover:bg-blue-600 dark:hover:bg-blue-600 dark:hover:text-white transition-all disabled:opacity-60 active:scale-95">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Award size={16} />}
          {submitting ? 'Issuing...' : 'Issue Credential'}
        </button>
      </form>
    </div>
  );
}

/* ── Sell Tab ─────────────────────────────────────── */
const SELL_CATEGORIES = ["Service", "Template", "Asset"];
const emptyListingForm = { title: '', description: '', category: 'Service', price: '', image_url: '', tags: '' };

function SellTab({ currentUserId, isPremium, isAdmin }) {
  const canSell = isPremium || isAdmin;

  const [myListings, setMyListings] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyListingForm);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [formError, setFormError] = useState('');

  const fetchMyListings = useCallback(async () => {
    if (!currentUserId) { setLoadingList(false); return; }
    setLoadingList(true);
    const { data } = await supabase
      .from('marketplace_listings')
      .select('id, title, description, category, price, image_url, tags, is_active, purchases, created_at')
      .eq('seller_id', currentUserId)
      .order('created_at', { ascending: false });
    if (data) setMyListings(data);
    setLoadingList(false);
  }, [currentUserId]);

  useEffect(() => { fetchMyListings(); }, [fetchMyListings]);

  const openNew = () => { setEditItem(null); setForm(emptyListingForm); setFormError(''); setShowForm(true); };

  const openEdit = (listing) => {
    setEditItem(listing);
    setForm({
      title: listing.title,
      description: listing.description || '',
      category: listing.category,
      price: listing.price?.toString() || '',
      image_url: listing.image_url || '',
      tags: (listing.tags || []).join(', '),
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true); setFormError('');
    const payload = {
      seller_id: currentUserId,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      price: form.price !== '' ? parseFloat(form.price) : 0,
      currency: 'USD',
      image_url: form.image_url.trim() || null,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      is_active: true,
    };
    try {
      if (editItem) {
        const { error } = await supabase.from('marketplace_listings').update(payload).eq('id', editItem.id);
        if (error) throw error;
        setSuccessMsg('Listing updated!');
      } else {
        const { error } = await supabase.from('marketplace_listings').insert({ ...payload, purchases: 0 });
        if (error) throw error;
        setSuccessMsg('Listing published! It\'s now live in Browse.');
      }
      setShowForm(false); setEditItem(null); setForm(emptyListingForm);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchMyListings();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (listing) => {
    await supabase.from('marketplace_listings').update({ is_active: !listing.is_active }).eq('id', listing.id);
    setMyListings(prev => prev.map(l => l.id === listing.id ? { ...l, is_active: !l.is_active } : l));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this listing permanently?')) return;
    await supabase.from('marketplace_listings').delete().eq('id', id);
    setMyListings(prev => prev.filter(l => l.id !== id));
  };

  if (!currentUserId) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Store size={40} className="text-gray-300 dark:text-gray-700 mb-4" />
      <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-1">Sign in to sell</h3>
    </div>
  );

  if (!canSell) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Crown size={40} className="text-amber-300 mb-4" />
      <h3 className="font-black text-gray-900 dark:text-gray-100 text-lg mb-2">Premium Required to Sell</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-5">
        Upgrade to Premium to list your services, templates, and assets in the marketplace and earn from the community.
      </p>
      <a
        href="/dash/premium"
        className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-amber-500/30"
      >
        <Crown size={14} /> Upgrade to Premium
      </a>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-gray-900 dark:text-gray-100">My Listings</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{myListings.length} listing{myListings.length !== 1 ? 's' : ''} published</p>
        </div>
        {!showForm && (
          <button onClick={openNew} className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-blue-600 transition-all">
            <Plus size={13} /> New Listing
          </button>
        )}
      </div>

      {/* Success */}
      {successMsg && (
        <div className="flex items-center gap-2 text-sm font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-xl px-4 py-3 animate-in fade-in duration-200">
          <CheckCircle2 size={15} /> {successMsg}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-gray-900 dark:text-gray-100 text-sm">{editItem ? 'Edit Listing' : 'New Listing'}</h3>
            <button type="button" onClick={() => { setShowForm(false); setEditItem(null); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <X size={15} />
            </button>
          </div>

          {formError && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl px-3 py-2">
              <AlertTriangle size={13} /> {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Category *</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={inputCls}>
                {SELL_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_ICON[c]} {c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Price USD (0 = free)</label>
              <input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="0" className={inputCls} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Title *</label>
            <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. React Dashboard Template" className={inputCls} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What does this include? Who is it for?" rows={3} className={`${inputCls} resize-none`} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Cover Image URL</label>
            <input value={form.image_url} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://images.unsplash.com/..." className={inputCls} />
            {form.image_url && (
              <div className="relative w-full h-24 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 mt-1.5">
                <Image src={form.image_url} alt="preview" fill sizes="100%" className="object-cover" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Tags (comma-separated)</label>
            <input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="React, Tailwind, Next.js" className={inputCls} />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => { setShowForm(false); setEditItem(null); }} className="flex-1 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-black text-sm rounded-xl hover:bg-blue-600 dark:hover:bg-blue-600 dark:hover:text-white transition-all disabled:opacity-60">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {submitting ? 'Publishing...' : editItem ? 'Save Changes' : 'Publish Listing'}
            </button>
          </div>
        </form>
      )}

      {/* My listings grid */}
      {loadingList ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map(i => <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : myListings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Store size={36} className="text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">No listings yet</p>
          <p className="text-xs text-gray-400">Click "New Listing" to publish your first item.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {myListings.map(listing => (
            <div key={listing.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="relative w-full h-32 bg-gray-100 dark:bg-gray-800">
                <Image
                  src={listing.image_url || `https://picsum.photos/seed/${listing.id}/400/200`}
                  alt={listing.title} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover"
                />
                <div className="absolute top-2 left-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${CATEGORY_BADGE[listing.category] || CATEGORY_BADGE.Asset}`}>
                    {CATEGORY_ICON[listing.category]} {listing.category}
                  </span>
                </div>
                <div className="absolute top-2 right-2">
                  <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${listing.is_active ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
                    {listing.is_active ? 'Live' : 'Hidden'}
                  </span>
                </div>
              </div>
              <div className="p-3">
                <p className="font-black text-sm text-gray-900 dark:text-gray-100 line-clamp-1 mb-2">{listing.title}</p>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 shrink-0">
                    {listing.price === 0 ? 'Free' : `$${listing.price}`} · {listing.purchases || 0} sold
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleToggleActive(listing)} title={listing.is_active ? 'Hide listing' : 'Show listing'} className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all">
                      {listing.is_active ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button onClick={() => openEdit(listing)} title="Edit" className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(listing.id)} title="Delete" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Verify Tab ───────────────────────────────────── */
function VerifyTab() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    const hash = input.includes('/verify/') ? input.split('/verify/').pop().trim() : input.trim();
    if (!hash) return;
    setLoading(true); setResult(null); setNotFound(false);
    const { data, error } = await supabase.from('credentials').select('id, title, description, credential_type, blockchain_hash, issued_at, expires_at, is_tradeable, issuer:issuer_id(username, avatar_url, is_verified), profiles:user_id(username, avatar_url)').eq('blockchain_hash', hash).maybeSingle();
    setLoading(false);
    if (error || !data) { setNotFound(true); return; }
    setResult(data);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="font-black text-gray-900 dark:text-gray-100 text-base mb-1">Verify a Credential</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Paste a blockchain hash or verification URL to check authenticity.</p>
        <form onSubmit={handleVerify} className="flex gap-2">
          <input value={input} onChange={e => { setInput(e.target.value); setNotFound(false); setResult(null); }} placeholder="e.g. a3f8b2c1... or /verify/..." className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
          <button type="submit" disabled={!input || loading} className="flex items-center gap-1.5 text-sm font-black uppercase tracking-widest px-4 py-2.5 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-blue-600 transition-all disabled:opacity-60 active:scale-95">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />} Verify
          </button>
        </form>
      </div>
      {notFound && (
        <div className="flex flex-col items-center justify-center py-10 text-center bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-2xl">
          <AlertTriangle size={32} className="text-red-400 mb-3" />
          <h3 className="font-bold text-red-700 dark:text-red-400 mb-1">Not found or revoked</h3>
        </div>
      )}
      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-xl px-3 py-2">
            <CheckCircle2 size={16} /> Credential verified successfully
          </div>
          <CredentialCard cred={result} showActions={false} />
          {result.profiles && <p className="text-xs text-center text-gray-500 dark:text-gray-400">Held by <strong>@{result.profiles.username}</strong></p>}
        </div>
      )}
    </div>
  );
}

/* ── Root Component ───────────────────────────────── */
const TABS = [
  { key: 'browse',      label: 'Browse',          icon: ShoppingBag },
  { key: 'library',     label: 'My Library',       icon: Library },
  { key: 'credentials', label: 'My Credentials',   icon: Award },
  { key: 'sell',        label: 'Sell',             icon: Store },
  { key: 'issue',       label: 'Issue Credential', icon: Plus },
  { key: 'verify',      label: 'Verify',           icon: Shield },
  { key: 'partnerships', label: 'Partnerships',    icon: Handshake },
];

export default function MarketplaceContent() {
  const [activeTab, setActiveTab] = useState('browse');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [libraryIds, setLibraryIds] = useState(new Set());
  const [toast, setToast] = useState(null);

  /* Modal state */
  const [selectedListing, setSelectedListing] = useState(null);
  const [selectedLibItem, setSelectedLibItem] = useState(null);
  const [selectedCred, setSelectedCred] = useState(null);

  /* Load Paystack script once */
  useEffect(() => {
    if (document.getElementById('paystack-mkt-script')) return;
    const s = document.createElement('script');
    s.id = 'paystack-mkt-script';
    s.src = 'https://js.paystack.co/v1/inline.js';
    s.async = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      setCurrentUserId(session.user.id);
      setUserEmail(session.user.email || '');
      const [profileRes, libraryRes] = await Promise.all([
        supabase.from('profiles').select('id, username, role, is_admin, is_premium, is_verified').eq('id', session.user.id).single(),
        supabase.from('user_library').select('listing_id').eq('user_id', session.user.id),
      ]);
      if (profileRes.data) setCurrentProfile(profileRes.data);
      if (libraryRes.data) setLibraryIds(new Set(libraryRes.data.map(r => r.listing_id)));
    };
    init();
  }, []);

  const handleAddToLibrary = (listing) => {
    setLibraryIds(prev => new Set([...prev, listing.id]));
    setToast(listing);
  };

  const isPremium = currentProfile?.is_premium === true;

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tighter">Marketplace</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 font-medium">Courses, credentials, templates, and more from the beoneofus community.</p>
      </div>

      <div className="flex gap-1 overflow-x-auto custom-scrollbar border-b border-gray-200 dark:border-gray-800 flex-nowrap pb-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center shrink-0 gap-1.5 px-4 py-2.5 text-xs font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-all -mb-px ${
                activeTab === tab.key
                  ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon size={13} /> {tab.label}
              {tab.key === 'library' && libraryIds.size > 0 && (
                <span className="ml-1 text-[9px] font-black bg-blue-600 text-white rounded-full px-1.5 py-0.5 leading-none">{libraryIds.size}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="max-h-[calc(100vh-220px)] sm:max-h-[calc(100vh-280px)] lg:max-h-[calc(100vh-340px)] overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar transition-all duration-300 border-t border-gray-100 dark:border-gray-800/50 pt-4 sticky top-0 z-10 bg-white dark:bg-gray-900">
        {activeTab === 'browse'      && <BrowseTab currentUserId={currentUserId} libraryIds={libraryIds} isPremium={isPremium} onAddToLibrary={handleAddToLibrary} onSelectListing={setSelectedListing} />}
        {activeTab === 'library'     && <MyLibraryTab currentUserId={currentUserId} onSelectItem={setSelectedLibItem} />}
        {activeTab === 'credentials' && <MyCredentialsTab currentUserId={currentUserId} onSelectCred={setSelectedCred} />}
        {activeTab === 'sell'        && <SellTab currentUserId={currentUserId} isPremium={isPremium} isAdmin={currentProfile?.is_admin === true || currentProfile?.role === 'founder'} />}
        {activeTab === 'issue'       && <IssueCredentialTab currentUserId={currentUserId} currentProfile={currentProfile} />}
        {activeTab === 'verify'      && <VerifyTab />}
        {activeTab === 'partnerships' && <PartnershipsContent />}
      </div>

      {/* Toast */}
      {toast && (
        <ToastCard
          item={toast}
          onClose={() => setToast(null)}
          onViewLibrary={() => { setToast(null); setActiveTab('library'); }}
        />
      )}

      {/* Listing detail modal */}
      {selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          currentUserId={currentUserId}
          userEmail={userEmail}
          isPremium={isPremium}
          inLibrary={libraryIds.has(selectedListing.id)}
          onClose={() => setSelectedListing(null)}
          onAddToLibrary={(listing) => { handleAddToLibrary(listing); setSelectedListing(null); }}
        />
      )}

      {/* Library item modal */}
      {selectedLibItem && (
        <LibraryItemModal item={selectedLibItem} onClose={() => setSelectedLibItem(null)} />
      )}

      {/* Credential detail modal */}
      {selectedCred && (
        <CredentialDetailModal cred={selectedCred} onClose={() => setSelectedCred(null)} />
      )}
    </div>
  );
}
