"use client";

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { supabase } from '../supabaseClient';
import {
  Package, ChevronRight, Truck, CheckCircle2, Clock, X, ShoppingCart,
  Shield, Sparkles, MapPin, Phone, RotateCcw, Star, ChevronDown,
  AlertCircle, Loader2, ArrowLeft, Copy, Check, Zap, Gift,
} from 'lucide-react';

const STATUS_CONFIG = {
  processing:   { label: 'Processing',       color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-500/10',   border: 'border-amber-200 dark:border-amber-500/20',   icon: <Loader2 size={13} className="animate-spin" /> },
  dispatched:   { label: 'Dispatched',       color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-500/10',     border: 'border-blue-200 dark:border-blue-500/20',     icon: <Truck size={13} /> },
  out_delivery: { label: 'Out for Delivery', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10', border: 'border-violet-200 dark:border-violet-500/20', icon: <Zap size={13} /> },
  delivered:    { label: 'Delivered',        color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20', icon: <CheckCircle2 size={13} /> },
  cancelled:    { label: 'Cancelled',        color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-500/10',       border: 'border-red-200 dark:border-red-500/20',       icon: <X size={13} /> },
};

const TRACKING_STEPS = [
  { key: 'processing',  label: 'Order Placed',        desc: 'Your order has been received and payment confirmed.' },
  { key: 'dispatched',  label: 'Packed & Dispatched', desc: 'Order packed in plain, unmarked packaging and handed to courier.' },
  { key: 'out_delivery',label: 'Out for Delivery',    desc: 'Your rider is on the way. Estimated arrival within 2 hours.' },
  { key: 'delivered',   label: 'Delivered',           desc: 'Package delivered to your address. Enjoy!' },
];
const STEP_ORDER = ['processing', 'dispatched', 'out_delivery', 'delivered'];

const COLOR_DOTS = {
  violet: 'bg-violet-400', rose: 'bg-rose-400', pink: 'bg-pink-400',
  emerald: 'bg-emerald-400', amber: 'bg-amber-400', indigo: 'bg-indigo-400', teal: 'bg-teal-400',
};

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function TrackingModal({ order, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!order) return null;
  const currentStep = STEP_ORDER.indexOf(order.status);
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.processing;

  const copy = () => {
    navigator.clipboard?.writeText(order.tracking).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-white dark:bg-[#141416] border border-gray-200 dark:border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-[#141416] border-b border-gray-100 dark:border-white/[0.06] px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="font-black text-gray-900 dark:text-white">Track Order</h3>
            <p className="text-[11px] text-gray-400 font-mono mt-0.5">{order.id?.slice(0, 12)}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className={`flex items-center justify-between p-4 rounded-2xl border ${cfg.bg} ${cfg.border}`}>
            <div className="flex items-center gap-2.5">
              <span className={cfg.color}>{cfg.icon}</span>
              <div>
                <p className={`font-black text-sm ${cfg.color}`}>{cfg.label}</p>
                {order.eta && <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1"><Clock size={10} /> ETA: {order.eta}</p>}
              </div>
            </div>
            {order.tracking && (
              <div className="text-right">
                <p className="text-xs text-gray-400 font-medium">Tracking</p>
                <button onClick={copy} className="flex items-center gap-1 text-[11px] font-mono font-bold text-gray-700 dark:text-gray-300 hover:text-rose-500 transition-colors mt-0.5">
                  {order.tracking} {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                </button>
              </div>
            )}
          </div>

          {order.discreet && (
            <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl">
              <Shield size={16} className="text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">Discreet packaging confirmed</p>
                <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">Plain sealed box · No brand name · Billing shown as generic merchant</p>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">Delivery Progress</h4>
            <div className="relative space-y-0">
              {TRACKING_STEPS.map((step, i) => {
                const done   = i <= currentStep;
                const active = i === currentStep;
                return (
                  <div key={step.key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all
                        ${active ? 'bg-rose-600 border-rose-600 text-white shadow-lg shadow-rose-600/30' :
                          done ? 'bg-emerald-500 border-emerald-500 text-white' :
                          'bg-gray-100 dark:bg-white/[0.04] border-gray-200 dark:border-white/[0.07] text-gray-400'}`}>
                        {done && !active ? <Check size={14} strokeWidth={3} /> : <span className="text-[11px] font-black">{i + 1}</span>}
                      </div>
                      {i < TRACKING_STEPS.length - 1 && (
                        <div className={`w-0.5 flex-1 min-h-[24px] mt-1 mb-1 rounded-full ${done ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-white/[0.06]'}`} />
                      )}
                    </div>
                    <div className={`pb-5 flex-1 ${i === TRACKING_STEPS.length - 1 ? 'pb-0' : ''}`}>
                      <p className={`text-sm font-black leading-none mb-1 ${active ? 'text-rose-600 dark:text-rose-400' : done ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'}`}>{step.label}</p>
                      <p className={`text-xs leading-relaxed ${done ? 'text-gray-500 dark:text-gray-400' : 'text-gray-300 dark:text-gray-700'}`}>{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {order.items?.length > 0 && (
            <div>
              <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Items in Order</h4>
              <div className="space-y-2">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-white/[0.04]">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${COLOR_DOTS[item.color] || 'bg-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.name}</p>
                      <p className="text-[11px] text-gray-400">Qty: {item.qty}</p>
                    </div>
                    <p className="text-sm font-black text-gray-900 dark:text-white shrink-0">${((item.price || 0) * (item.qty || 1)).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {order.address && (
            <div className="flex items-center gap-2.5 p-3.5 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-white/[0.04]">
              <MapPin size={14} className="text-gray-400 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Delivery Address</p>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-0.5">{order.address}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-gray-900 dark:bg-white/[0.04] rounded-2xl">
            <span className="text-sm font-bold text-gray-300 dark:text-gray-400">Order Total</span>
            <span className="text-lg font-black text-white">${Number(order.total || 0).toFixed(2)}</span>
          </div>

          {order.status !== 'delivered' && order.status !== 'cancelled' && (
            <button className="w-full py-3 border border-gray-200 dark:border-white/[0.08] rounded-2xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors flex items-center justify-center gap-2">
              <Phone size={14} /> Contact Support
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function OrdersPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const isCheckout   = searchParams.get('checkout') === '1';

  const [mounted, setMounted]           = useState(false);
  const [orders, setOrders]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [fetchError, setFetchError]     = useState(null);
  const [tracking, setTracking]         = useState(null);
  const [filter, setFilter]             = useState('all');
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutDone, setCheckoutDone] = useState(false);
  const [rating, setRating]             = useState({});

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth?next=/orders');
        return;
      }
      const res = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to load orders');
      }
      const { orders: data } = await res.json();
      setOrders(data || []);
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
      if (isCheckout) setShowCheckout(true);
      fetchOrders();
    });
    return () => cancelAnimationFrame(frame);
  }, [isCheckout, fetchOrders]);

  const filtered = orders.filter(o => filter === 'all' || o.status === filter);

  const stats = {
    total:     orders.length,
    active:    orders.filter(o => ['processing','dispatched','out_delivery'].includes(o.status)).length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#09090b] font-sans">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideUp { from { opacity:0;transform:translateY(16px) scale(0.97); } to { opacity:1;transform:none; } }
        .slide-up { animation: slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards; }
        @keyframes checkPop { 0%{transform:scale(0);} 60%{transform:scale(1.3);} 100%{transform:scale(1);} }
        .check-pop { animation: checkPop 0.5s ease-out forwards; }
      `}} />

      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-[#09090b]/95 backdrop-blur-xl border-b border-gray-200/60 dark:border-white/[0.06] px-4 sm:px-6 h-14 flex items-center">
        <div className="w-full max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/shop" className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
                <Package size={13} className="text-white" />
              </div>
              <span className="font-black text-sm text-gray-900 dark:text-white">My <span className="text-violet-600">Orders</span></span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchOrders} disabled={loading} className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-50">
              <RotateCcw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <Link href="/shop" className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black transition-all active:scale-95">
              <ShoppingCart size={13} /> Shop More
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {showCheckout && !checkoutDone && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-white dark:bg-[#141416] rounded-3xl shadow-2xl p-8 text-center slide-up">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-5 check-pop">
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Order Placed!</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-5">
                Your order has been confirmed. We&apos;ll pack it discreetly and dispatch within 1 hour.
              </p>
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 mb-5">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <Shield size={15} />
                  <p className="text-xs font-bold">Plain, unmarked packaging. No brand name anywhere.</p>
                </div>
              </div>
              <button onClick={() => { setShowCheckout(false); setCheckoutDone(true); }}
                className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl transition-all active:scale-[0.98] text-sm">
                View My Orders
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Orders', value: stats.total,     color: 'text-gray-900 dark:text-white',           bg: 'bg-white dark:bg-[#111113]' },
            { label: 'Active',       value: stats.active,    color: 'text-violet-600 dark:text-violet-400',    bg: 'bg-violet-50 dark:bg-violet-500/10' },
            { label: 'Delivered',    value: stats.delivered, color: 'text-emerald-600 dark:text-emerald-400',  bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          ].map(s => (
            <div key={s.label} className={`p-4 rounded-2xl border border-gray-200 dark:border-white/[0.05] text-center ${s.bg}`}>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Active delivery banner */}
        {orders.find(o => o.status === 'out_delivery') && (() => {
          const active = orders.find(o => o.status === 'out_delivery');
          return (
            <div className="relative overflow-hidden p-4 sm:p-5 bg-gradient-to-r from-violet-600 to-rose-600 rounded-2xl text-white shadow-lg shadow-violet-600/20">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
              <div className="relative flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0"><Truck size={18} /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-0.5">Rider en route</p>
                    <p className="font-black text-sm">Order #{active.id?.slice(0,8)} {active.eta ? `— ETA ${active.eta}` : ''}</p>
                  </div>
                </div>
                <button onClick={() => setTracking(active)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-black transition-colors border border-white/20">
                  Track <ChevronRight size={12} />
                </button>
              </div>
            </div>
          );
        })()}

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {[
            { key: 'all',          label: 'All',         count: orders.length },
            { key: 'processing',   label: 'Processing',  count: orders.filter(o=>o.status==='processing').length },
            { key: 'dispatched',   label: 'Dispatched',  count: orders.filter(o=>o.status==='dispatched').length },
            { key: 'out_delivery', label: 'En Route',    count: orders.filter(o=>o.status==='out_delivery').length },
            { key: 'delivered',    label: 'Delivered',   count: orders.filter(o=>o.status==='delivered').length },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{ flexShrink: 0 }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all
                ${filter === f.key ? 'bg-violet-600 border-violet-600 text-white shadow-sm shadow-violet-600/20' : 'bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-500 dark:text-gray-500 hover:border-violet-300 dark:hover:border-violet-500/30'}`}>
              {f.label}
              {f.count > 0 && <span className={`text-[9px] font-black px-1.5 py-px rounded-full ${filter === f.key ? 'bg-white/20' : 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400'}`}>{f.count}</span>}
            </button>
          ))}
        </div>

        {/* Loading / Error / Empty / List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-violet-500 mb-3" />
            <p className="text-sm text-gray-400 font-medium">Loading your orders…</p>
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-200 dark:border-red-500/20">
            <AlertCircle size={28} className="text-red-400 mb-3" />
            <p className="font-black text-red-600 dark:text-red-400">{fetchError}</p>
            <button onClick={fetchOrders} className="mt-3 text-sm font-bold text-red-500 hover:text-red-600 transition-colors">Try again</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <Package size={26} className="text-gray-300 dark:text-gray-700" />
            </div>
            <p className="font-black text-gray-500 dark:text-gray-400">No orders yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Your orders will appear here after purchase.</p>
            <Link href="/shop" className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl text-sm transition-all">
              <ShoppingCart size={14} /> Browse Shop
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => {
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.processing;
              const isActive = ['processing','dispatched','out_delivery'].includes(order.status);
              return (
                <div key={order.id} className="bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/[0.05] rounded-2xl overflow-hidden hover:shadow-md dark:hover:shadow-black/30 transition-all">
                  <div className={`h-1 w-full ${order.status === 'delivered' ? 'bg-emerald-500' : order.status === 'out_delivery' ? 'bg-violet-500' : order.status === 'dispatched' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm text-gray-900 dark:text-white font-mono">#{order.id?.slice(0, 8)}</span>
                          <span className={`flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                            {cfg.icon} {cfg.label}
                          </span>
                          {order.discreet && (
                            <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                              <Shield size={9} /> Discreet
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                          <Clock size={10} /> {formatDate(order.created_at)} · {timeAgo(order.created_at)}
                        </p>
                        {order.eta && isActive && (
                          <p className="text-[11px] font-bold text-violet-600 dark:text-violet-400 mt-0.5 flex items-center gap-1">
                            <Truck size={10} /> ETA: {order.eta}
                          </p>
                        )}
                      </div>
                      <p className="font-black text-lg text-gray-900 dark:text-white shrink-0">${Number(order.total || 0).toFixed(2)}</p>
                    </div>

                    {order.items?.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex items-center gap-2.5">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${COLOR_DOTS[item.color] || 'bg-gray-400'}`} />
                            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">{item.name}</span>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 shrink-0">×{item.qty}</span>
                            <span className="text-xs font-black text-gray-900 dark:text-white shrink-0">${((item.price || 0) * (item.qty || 1)).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-white/[0.04]">
                      <button onClick={() => setTracking(order)}
                        className="flex-1 py-2.5 bg-gray-50 dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl transition-colors border border-gray-200 dark:border-white/[0.05] flex items-center justify-center gap-1.5">
                        <MapPin size={12} /> Track Order
                      </button>
                      {order.status === 'delivered' && !rating[order.id] && (
                        <button onClick={() => setRating(r => ({ ...r, [order.id]: true }))}
                          className="flex-1 py-2.5 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold text-xs rounded-xl transition-colors border border-amber-200 dark:border-amber-500/20 flex items-center justify-center gap-1.5">
                          <Star size={12} /> Rate Order
                        </button>
                      )}
                      {rating[order.id] && (
                        <div className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20">
                          {[1,2,3,4,5].map(s => (
                            <button key={s} onClick={() => setRating(r => ({ ...r, [order.id]: s }))} className="transition-transform hover:scale-110 active:scale-95">
                              <Star size={18} fill={typeof rating[order.id] === 'number' && s <= rating[order.id] ? 'currentColor' : 'none'}
                                className={typeof rating[order.id] === 'number' && s <= rating[order.id] ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'} />
                            </button>
                          ))}
                        </div>
                      )}
                      {isActive && (
                        <button className="py-2.5 px-3 bg-white dark:bg-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.06] text-gray-400 hover:text-rose-500 font-bold text-xs rounded-xl transition-colors border border-gray-200 dark:border-white/[0.05] flex items-center gap-1">
                          <Phone size={12} /> Help
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Service guarantees */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          {[
            { icon: <Shield size={18} className="text-emerald-500" />, title: 'Discreet Always',  desc: 'Every order ships in a plain box. No brand name, no product description.' },
            { icon: <RotateCcw size={18} className="text-blue-500" />, title: 'Easy Returns',     desc: 'Unopened items can be returned within 30 days, free of charge.' },
            { icon: <Gift size={18} className="text-violet-500" />,    title: 'Discreet Gifting', desc: 'Send directly to someone else. We use plain labels with no sender details.' },
          ].map(s => (
            <div key={s.title} className="flex gap-3 p-4 bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/[0.05] rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/[0.04] flex items-center justify-center shrink-0">{s.icon}</div>
              <div>
                <p className="text-sm font-black text-gray-900 dark:text-white">{s.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TrackingModal order={tracking} onClose={() => setTracking(null)} />
    </div>
  );
}

// useSearchParams() must be inside a Suspense boundary in Next 16 or the
// route deopts to fully client-side rendering / fails `next build`.
export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersPageInner />
    </Suspense>
  );
}
