'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Plus, Search, Loader2, Clock, DollarSign,
  X, ChevronDown, Tag, Send, CheckCircle2, Pencil, Trash2,
  Store, Sparkles, MessageCircle, ShoppingCart,
  CalendarDays, BadgeCheck, ArrowRight,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

const CATEGORIES = ['All', 'Dev', 'Design', 'Writing', 'Marketing', 'Consulting', 'Service'];

const CAT_COLOR = {
  Dev:        'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  Design:     'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
  Writing:    'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  Marketing:  'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
  Consulting: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
  Service:    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
};

const CAT_BAR = {
  Dev: 'bg-blue-500', Design: 'bg-violet-500', Writing: 'bg-amber-500',
  Marketing: 'bg-rose-500', Consulting: 'bg-teal-500', Service: 'bg-green-500',
};

const inputCls = 'w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all';

/* ── Modal — never overflows viewport ─────────────────────── */
function Modal({ onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      style={{ padding: '1rem' }}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-y-auto"
        style={{ width: '100%', maxWidth: '560px', maxHeight: '90vh' }}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Detail Modal — wider but still contained ─────────────── */
function DetailModal({ onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      style={{ padding: '1rem' }}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-y-auto"
        style={{ width: '100%', maxWidth: '640px', maxHeight: '92vh' }}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Avatar ────────────────────────────────────────────────── */
function Avatar({ src, name, px = 32 }) {
  return (
    <div
      className="rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-white flex items-center justify-center font-black overflow-hidden shrink-0"
      style={{ width: px, height: px, fontSize: px * 0.38 }}
    >
      {src
        ? <Image src={src} alt={name || ''} width={px} height={px} className="object-cover w-full h-full" referrerPolicy="no-referrer" />
        : name?.[0]?.toUpperCase()}
    </div>
  );
}

/* ── Service Detail Modal ──────────────────────────────────── */
function ServiceDetailModal({ service, isOwn, userId, session, onClose, onEdit, onDelete, onOrderSuccess }) {
  const [panel, setPanel]           = useState('order');
  const [requirements, setRequirements] = useState('');
  const [note, setNote]             = useState('');
  const [saving, setSaving]         = useState(false);
  const [done, setDone]             = useState('');

  const seller     = service.profiles;
  const sellerName = seller?.username || 'Anonymous';
  const catStyle   = CAT_COLOR[service.category] || 'bg-gray-100 dark:bg-gray-800 text-gray-600';
  const barColor   = CAT_BAR[service.category]   || 'bg-gray-400';

  const handleOrder = async () => {
    if (!session || !requirements.trim()) return;
    setSaving(true);
    try {
      await supabase.from('service_orders').insert({
        service_id:   service.id,
        buyer_id:     userId,
        seller_id:    service.seller_id,
        amount_usd:   service.price_usd,
        requirements: requirements.trim(),
        status:       'pending',
      });
      setDone('order');
      onOrderSuccess?.();
    } finally {
      setSaving(false);
    }
  };

  const handleNote = async () => {
    if (!session || !note.trim()) return;
    setSaving(true);
    try {
      await supabase.from('messages').insert({
        sender_id:   userId,
        receiver_id: service.seller_id,
        text:        `[Re: ${service.title}] ${note.trim()}`,
      });
      await supabase.from('notifications').insert({
        receiver_id: service.seller_id,
        actor_id:    userId,
        type:        'message',
        message:     `sent you a note about your service "${service.title}"`,
      }).maybeSingle();
      setDone('note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DetailModal onClose={onClose}>
      {/* colour bar */}
      <div className={`h-1.5 rounded-t-2xl ${barColor}`} />

      {/* header */}
      <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div className="space-y-1 flex-1 min-w-0">
          <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${catStyle}`}>
            {service.category}
          </span>
          <h2 className="text-lg font-black text-gray-900 dark:text-gray-100 leading-snug">{service.title}</h2>
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-1">
          {isOwn && (
            <>
              <button onClick={() => { onEdit(service); onClose(); }} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                <Pencil size={14} className="text-gray-400" />
              </button>
              <button onClick={() => { onDelete(service.id); onClose(); }} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                <Trash2 size={14} className="text-red-400" />
              </button>
            </>
          )}
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
            <X size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">

        {/* seller row */}
        <div className="flex items-center gap-3">
          <Avatar src={seller?.avatar_url} name={sellerName} px={40} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">@{sellerName}</span>
              {seller?.is_verified && <BadgeCheck size={14} className="text-blue-500" />}
            </div>
            <span className="text-xs text-gray-400">Service provider</span>
          </div>
        </div>

        {/* stats pills */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2.5 rounded-2xl">
            <DollarSign size={15} className="text-emerald-500" />
            <div>
              <p className="text-base font-black text-emerald-700 dark:text-emerald-300 leading-none">${service.price_usd}</p>
              <p className="text-[10px] text-emerald-600/60 dark:text-emerald-500/60 mt-0.5">Price</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-4 py-2.5 rounded-2xl">
            <Clock size={15} className="text-blue-500" />
            <div>
              <p className="text-base font-black text-blue-700 dark:text-blue-300 leading-none">{service.delivery_days} days</p>
              <p className="text-[10px] text-blue-600/60 dark:text-blue-500/60 mt-0.5">Delivery</p>
            </div>
          </div>
          {service.field && (
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 rounded-2xl">
              <Tag size={14} className="text-gray-400" />
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{service.field}</p>
            </div>
          )}
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 rounded-2xl">
            <CalendarDays size={14} className="text-gray-400" />
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {new Date(service.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* description */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">About this service</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{service.description}</p>
        </div>

        {/* actions */}
        {!isOwn && session && !done && (
          <div className="space-y-3 pt-1">
            <div className="flex gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              <button
                onClick={() => setPanel('order')}
                className={`flex-1 flex items-center justify-center gap-2 text-xs font-black py-2 rounded-lg transition-all ${panel === 'order' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
              >
                <ShoppingCart size={13} /> Place Order
              </button>
              <button
                onClick={() => setPanel('note')}
                className={`flex-1 flex items-center justify-center gap-2 text-xs font-black py-2 rounded-lg transition-all ${panel === 'note' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
              >
                <MessageCircle size={13} /> Leave a Note
              </button>
            </div>

            {panel === 'order' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Your Requirements *</label>
                  <textarea
                    className={`${inputCls} resize-none`}
                    rows={4}
                    value={requirements}
                    onChange={e => setRequirements(e.target.value)}
                    placeholder="Describe what you need — include links, assets, or context the seller should know…"
                  />
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-3">
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    Payment is processed via Paystack after the seller confirms your order.
                  </p>
                </div>
                <button
                  onClick={handleOrder}
                  disabled={saving || !requirements.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black transition-all active:scale-95 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
                  {saving ? 'Placing order…' : `Order · $${service.price_usd}`}
                </button>
              </div>
            )}

            {panel === 'note' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Message to @{sellerName}</label>
                  <textarea
                    className={`${inputCls} resize-none`}
                    rows={4}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Ask a question, request a custom quote, or introduce yourself…"
                    maxLength={500}
                  />
                  <p className="text-[10px] text-gray-400 mt-1 text-right">{note.length}/500</p>
                </div>
                <button
                  onClick={handleNote}
                  disabled={saving || !note.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-black transition-all active:scale-95 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {saving ? 'Sending…' : 'Send Note'}
                </button>
              </div>
            )}
          </div>
        )}

        {done === 'order' && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-5 text-center space-y-2">
            <CheckCircle2 size={28} className="text-emerald-500 mx-auto" />
            <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">Order placed!</p>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-500/80">The seller will reach out to confirm and arrange payment.</p>
          </div>
        )}
        {done === 'note' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-2xl p-5 text-center space-y-2">
            <MessageCircle size={28} className="text-blue-500 mx-auto" />
            <p className="text-sm font-black text-blue-700 dark:text-blue-400">Note sent!</p>
            <p className="text-xs text-blue-600/80 dark:text-blue-500/80">Your message was delivered to @{sellerName}. Check Messages for their reply.</p>
          </div>
        )}

        {!session && !isOwn && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-5 text-center">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Sign in to order or message the seller</p>
          </div>
        )}

        {isOwn && (
          <div className={`rounded-2xl px-4 py-3 text-center text-xs font-bold ${service.is_active ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
            {service.is_active ? 'This service is live and visible to everyone' : 'This service is paused'}
          </div>
        )}
      </div>
    </DetailModal>
  );
}

/* ── Create / Edit form ────────────────────────────────────── */
function ServiceForm({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState({
    title:         initial?.title || '',
    description:   initial?.description || '',
    price_usd:     initial?.price_usd || '',
    delivery_days: initial?.delivery_days || 7,
    category:      initial?.category || 'Dev',
    field:         initial?.field || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-base font-black text-gray-900 dark:text-gray-100">{initial ? 'Edit Service' : 'Post a Service'}</p>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
          <X size={16} className="text-gray-400" />
        </button>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Service Title *</label>
        <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Build a REST API in Node.js" maxLength={100} />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Description *</label>
        <textarea className={`${inputCls} resize-none`} rows={4} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What will you deliver? Include deliverables and requirements." maxLength={1000} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Price (USD) *</label>
          <div className="relative">
            <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className={`${inputCls} pl-7`} type="number" min="1" value={form.price_usd} onChange={e => set('price_usd', e.target.value)} placeholder="50" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Delivery (days)</label>
          <input className={inputCls} type="number" min="1" max="90" value={form.delivery_days} onChange={e => set('delivery_days', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Category</label>
          <div className="relative">
            <select className={`${inputCls} appearance-none pr-8`} value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Field / Industry</label>
          <input className={inputCls} value={form.field} onChange={e => set('field', e.target.value)} placeholder="e.g. FinTech, SaaS" maxLength={60} />
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.title.trim() || !form.description.trim() || !form.price_usd}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-black transition-all active:scale-95 disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          {saving ? 'Saving…' : 'Save Service'}
        </button>
      </div>
    </div>
  );
}

/* ── Service Card — wide horizontal layout ─────────────────── */
function ServiceCard({ service, isOwn, onClick, onEdit, onDelete }) {
  const catStyle   = CAT_COLOR[service.category] || 'bg-gray-100 dark:bg-gray-800 text-gray-600';
  const barColor   = CAT_BAR[service.category]   || 'bg-gray-400';
  const sellerName = service.profiles?.username   || 'Anonymous';

  return (
    <div
      onClick={onClick}
      className="group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 cursor-pointer hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200 overflow-hidden"
    >
      {/* left colour bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${barColor} rounded-l-2xl`} />

      <div className="pl-5 pr-5 py-5 flex gap-5 items-start">

        {/* main content */}
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${catStyle}`}>
              {service.category}
            </span>
            {service.field && (
              <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                <Tag size={10} />{service.field}
              </span>
            )}
          </div>

          <p className="text-[15px] font-black text-gray-900 dark:text-gray-100 leading-snug line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {service.title}
          </p>

          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
            {service.description}
          </p>

          {/* seller */}
          <div className="flex items-center gap-2 pt-0.5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-white flex items-center justify-center text-[9px] font-black overflow-hidden shrink-0">
              {service.profiles?.avatar_url
                ? <Image src={service.profiles.avatar_url} alt={sellerName} width={20} height={20} className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                : sellerName[0]?.toUpperCase()}
            </div>
            <span className="text-[11px] text-gray-400 dark:text-gray-500">@{sellerName}</span>
            {service.profiles?.is_verified && <BadgeCheck size={11} className="text-blue-500" />}
          </div>
        </div>

        {/* right panel */}
        <div className="shrink-0 flex flex-col items-end justify-between gap-4 self-stretch">
          {/* price */}
          <div className="text-right">
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 leading-none">${service.price_usd}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-0.5 justify-end">
              <Clock size={9} />{service.delivery_days}d delivery
            </p>
          </div>

          {/* cta / status */}
          <div>
            {isOwn ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={e => { e.stopPropagation(); onEdit(service); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                >
                  <Pencil size={12} className="text-gray-400" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onDelete(service.id); }}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                >
                  <Trash2 size={12} className="text-red-400" />
                </button>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-1 ${service.is_active ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                  {service.is_active ? 'Active' : 'Paused'}
                </span>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                View <ArrowRight size={11} />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Status colours ────────────────────────────────────────── */
const STATUS_COLOR = {
  pending:   'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  active:    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  delivered: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
  complete:  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  cancelled: 'bg-gray-100 dark:bg-gray-800 text-gray-500',
  disputed:  'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
};

/* ── Main ──────────────────────────────────────────────────── */
export default function ServicesContent() {
  const [services, setServices]     = useState([]);
  const [myServices, setMyServices] = useState([]);
  const [myOrders, setMyOrders]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState('browse');
  const [category, setCategory]     = useState('All');
  const [search, setSearch]         = useState('');
  const [userId, setUserId]         = useState(null);
  const [session, setSession]       = useState(null);

  const [showCreate, setShowCreate]     = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [saving, setSaving]             = useState(false);
  const [toast, setToast]               = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const loadBrowse = useCallback(async () => {
    let q = supabase
      .from('services')
      .select('*, profiles(username, avatar_url, is_verified)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(40);
    if (category !== 'All') q = q.eq('category', category);
    if (search.trim())       q = q.ilike('title', `%${search.trim()}%`);
    const { data } = await q;
    setServices(data || []);
  }, [category, search]);

  const loadMine = useCallback(async (uid) => {
    if (!uid) return;
    const { data } = await supabase
      .from('services')
      .select('*, profiles(username, avatar_url, is_verified)')
      .eq('seller_id', uid)
      .order('created_at', { ascending: false });
    setMyServices(data || []);
  }, []);

  const loadOrders = useCallback(async (uid) => {
    if (!uid) return;
    const { data } = await supabase
      .from('service_orders')
      .select('*, services(title, price_usd), profiles!service_orders_seller_id_fkey(username, avatar_url)')
      .eq('buyer_id', uid)
      .order('created_at', { ascending: false })
      .limit(20);
    setMyOrders(data || []);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);
      if (s) {
        setUserId(s.user.id);
        await Promise.all([loadMine(s.user.id), loadOrders(s.user.id)]);
      }
      await loadBrowse();
      setLoading(false);
    };
    init();
  }, [loadBrowse, loadMine, loadOrders]);

  useEffect(() => { loadBrowse(); }, [loadBrowse]);

  const handleSaveService = async (form) => {
    if (!session) return;
    setSaving(true);
    try {
      const payload = {
        title:         form.title.trim(),
        description:   form.description.trim(),
        price_usd:     parseFloat(form.price_usd),
        delivery_days: parseInt(form.delivery_days, 10),
        category:      form.category,
        field:         form.field.trim() || null,
        seller_id:     userId,
      };
      if (editTarget) {
        await supabase.from('services').update(payload).eq('id', editTarget.id);
        showToast('Service updated');
      } else {
        await supabase.from('services').insert({ ...payload, is_active: true });
        showToast('Service published');
      }
      setShowCreate(false);
      setEditTarget(null);
      await Promise.all([loadMine(userId), loadBrowse()]);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this service?')) return;
    await supabase.from('services').delete().eq('id', id);
    await Promise.all([loadMine(userId), loadBrowse()]);
    showToast('Deleted');
  };

  return (
    <div className="space-y-5">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl animate-in slide-in-from-bottom-2 fade-in duration-200">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[3px] text-gray-400 dark:text-gray-500">Marketplace</p>
          <h1 className="text-xl font-black text-gray-900 dark:text-gray-100">Freelance Services</h1>
        </div>
        {session && (
          <button
            onClick={() => { setEditTarget(null); setShowCreate(true); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow-sm"
          >
            <Plus size={13} /> Post Service
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        {[
          { id: 'browse', label: 'Browse' },
          ...(session ? [{ id: 'mine', label: 'My Services' }, { id: 'orders', label: 'My Orders' }] : []),
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 text-xs font-black py-2 rounded-lg transition-all ${tab === t.id ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Browse */}
      {tab === 'browse' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className={`${inputCls} pl-9`} placeholder="Search services…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`shrink-0 text-[11px] font-bold px-3 py-2 rounded-xl border transition-all ${category === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-2xl" />)}
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Store size={22} className="text-gray-400" />
              </div>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">No services found</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Be the first to post a service in this category</p>
            </div>
          ) : (
            <div className="space-y-3">
              {services.map(s => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  isOwn={s.seller_id === userId}
                  onClick={() => setDetailTarget(s)}
                  onEdit={svc => { setEditTarget(svc); setShowCreate(true); }}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* My Services */}
      {tab === 'mine' && (
        myServices.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles size={22} className="text-blue-500" />
            </div>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No services yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-5">Post your first service and start earning</p>
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-5 py-2.5 rounded-xl transition-all active:scale-95">
              <Plus size={13} /> Post Service
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {myServices.map(s => (
              <ServiceCard
                key={s.id}
                service={s}
                isOwn
                onClick={() => setDetailTarget(s)}
                onEdit={svc => { setEditTarget(svc); setShowCreate(true); }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )
      )}

      {/* My Orders */}
      {tab === 'orders' && (
        myOrders.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">No orders yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Browse services and place your first order</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myOrders.map(o => (
              <div key={o.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{o.services?.title || 'Service'}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Seller: @{o.profiles?.username || 'unknown'} · ${o.amount_usd}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <span className={`shrink-0 text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${STATUS_COLOR[o.status] || STATUS_COLOR.pending}`}>
                  {o.status}
                </span>
              </div>
            ))}
          </div>
        )
      )}

      {/* Detail modal */}
      {detailTarget && (
        <ServiceDetailModal
          service={detailTarget}
          isOwn={detailTarget.seller_id === userId}
          userId={userId}
          session={session}
          onClose={() => setDetailTarget(null)}
          onEdit={svc => { setDetailTarget(null); setEditTarget(svc); setShowCreate(true); }}
          onDelete={handleDelete}
          onOrderSuccess={() => loadOrders(userId)}
        />
      )}

      {/* Create / Edit modal */}
      {showCreate && (
        <Modal onClose={() => { setShowCreate(false); setEditTarget(null); }}>
          <ServiceForm
            initial={editTarget}
            saving={saving}
            onClose={() => { setShowCreate(false); setEditTarget(null); }}
            onSave={handleSaveService}
          />
        </Modal>
      )}

    </div>
  );
}
