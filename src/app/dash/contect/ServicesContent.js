'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Briefcase, Plus, Search, Loader2, Star, Clock, DollarSign,
  X, ChevronDown, Tag, Send, CheckCircle2, Eye, Pencil, Trash2,
  ArrowRight, Store, Filter, Sparkles,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

const CATEGORIES = ['All', 'Dev', 'Design', 'Writing', 'Marketing', 'Consulting', 'Service'];

const CAT_COLOR = {
  Dev:         'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  Design:      'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
  Writing:     'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  Marketing:   'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
  Consulting:  'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
  Service:     'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
};

const inputCls = 'w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all';

/* ── Modal wrapper ───────────────────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white dark:bg-gray-900 flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 rounded-t-2xl">
          <p className="text-sm font-black text-gray-900 dark:text-gray-100">{title}</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ── Create / Edit service form ─────────────────────────── */
function ServiceForm({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    price_usd: initial?.price_usd || '',
    delivery_days: initial?.delivery_days || 7,
    category: initial?.category || 'Dev',
    field: initial?.field || '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Service Title *</label>
        <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Build a REST API in Node.js" maxLength={100} />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Description *</label>
        <textarea className={`${inputCls} resize-none`} rows={4} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What will you deliver? Include deliverables, requirements, and what's NOT included." maxLength={1000} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Price (USD) *</label>
          <div className="relative">
            <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className={`${inputCls} pl-7`} type="number" min="1" value={form.price_usd} onChange={e => set('price_usd', e.target.value)} placeholder="50" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Delivery (days)</label>
          <input className={inputCls} type="number" min="1" max="90" value={form.delivery_days} onChange={e => set('delivery_days', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Category</label>
          <div className="relative">
            <select
              className={`${inputCls} appearance-none pr-8`}
              value={form.category}
              onChange={e => set('category', e.target.value)}
            >
              {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Field / Industry</label>
          <input className={inputCls} value={form.field} onChange={e => set('field', e.target.value)} placeholder="e.g. FinTech, SaaS" maxLength={60} />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
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

/* ── Order form ──────────────────────────────────────────── */
function OrderForm({ service, onOrder, onClose, saving }) {
  const [requirements, setRequirements] = useState('');
  return (
    <div className="space-y-4">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-1">
        <p className="text-sm font-black text-gray-900 dark:text-gray-100">{service.title}</p>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1"><DollarSign size={11} />${service.price_usd}</span>
          <span className="flex items-center gap-1"><Clock size={11} />{service.delivery_days}d delivery</span>
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Your Requirements</label>
        <textarea
          className={`${inputCls} resize-none`}
          rows={4}
          value={requirements}
          onChange={e => setRequirements(e.target.value)}
          placeholder="Describe exactly what you need, any links, assets, or context the seller should know…"
        />
      </div>
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3">
        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
          Payment is processed via Paystack. You will be redirected to complete payment after placing the order.
        </p>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
          Cancel
        </button>
        <button
          onClick={() => onOrder(requirements)}
          disabled={saving || !requirements.trim()}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black transition-all active:scale-95 disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {saving ? 'Placing…' : `Order — $${service.price_usd}`}
        </button>
      </div>
    </div>
  );
}

/* ── Service card ────────────────────────────────────────── */
function ServiceCard({ service, isOwn, onEdit, onDelete, onOrder }) {
  const catStyle = CAT_COLOR[service.category] || 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
  const sellerName = service.profiles?.username || 'Anonymous';
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 ${catStyle}`}>
            {service.category}
          </span>
          <p className="text-sm font-black text-gray-900 dark:text-gray-100 leading-tight line-clamp-2">{service.title}</p>
        </div>
        {isOwn && (
          <div className="flex gap-1 shrink-0">
            <button onClick={() => onEdit(service)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
              <Pencil size={12} className="text-gray-400" />
            </button>
            <button onClick={() => onDelete(service.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
              <Trash2 size={12} className="text-red-400" />
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">{service.description}</p>

      <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
        <span className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300">
          <DollarSign size={12} className="text-emerald-500" />${service.price_usd}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={11} />{service.delivery_days}d
        </span>
        {service.field && (
          <span className="flex items-center gap-1">
            <Tag size={11} />{service.field}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3 mt-auto">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-black overflow-hidden relative">
            {service.profiles?.avatar_url
              ? <Image src={service.profiles.avatar_url} alt={sellerName} fill className="object-cover" sizes="20px" referrerPolicy="no-referrer" />
              : sellerName[0]?.toUpperCase()}
          </div>
          <span className="text-[11px] text-gray-500 dark:text-gray-400">@{sellerName}</span>
        </div>
        {!isOwn && (
          <button
            onClick={() => onOrder(service)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black px-3 py-1.5 rounded-xl transition-all active:scale-95"
          >
            Order <ArrowRight size={11} />
          </button>
        )}
        {isOwn && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${service.is_active ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
            {service.is_active ? 'Active' : 'Paused'}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────── */
export default function ServicesContent() {
  const [services, setServices]       = useState([]);
  const [myServices, setMyServices]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState('browse');       // browse | mine | orders
  const [category, setCategory]       = useState('All');
  const [search, setSearch]           = useState('');
  const [userId, setUserId]           = useState(null);
  const [session, setSession]         = useState(null);

  const [showCreate, setShowCreate]   = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  const [orderTarget, setOrderTarget] = useState(null);
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState('');

  const [myOrders, setMyOrders]       = useState([]);

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
      .select('*, profiles(username, avatar_url)')
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
      if (s) { setUserId(s.user.id); await loadMine(s.user.id); await loadOrders(s.user.id); }
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
      await loadMine(userId);
      await loadBrowse();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this service?')) return;
    await supabase.from('services').delete().eq('id', id);
    await loadMine(userId);
    await loadBrowse();
    showToast('Deleted');
  };

  const handleOrder = async (requirements) => {
    if (!session || !orderTarget) return;
    setSaving(true);
    try {
      await supabase.from('service_orders').insert({
        service_id:   orderTarget.id,
        buyer_id:     userId,
        seller_id:    orderTarget.seller_id,
        amount_usd:   orderTarget.price_usd,
        requirements: requirements.trim(),
        status:       'pending',
      });
      setOrderTarget(null);
      await loadOrders(userId);
      showToast('Order placed — seller will be notified');
    } finally {
      setSaving(false);
    }
  };

  const STATUS_COLOR = {
    pending:   'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    active:    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    delivered: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
    complete:  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    cancelled: 'bg-gray-100 dark:bg-gray-800 text-gray-500',
    disputed:  'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
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
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2 rounded-xl transition-all active:scale-95 shadow-sm"
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

      {/* Browse tab */}
      {tab === 'browse' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className={`${inputCls} pl-9`}
                placeholder="Search services…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-52 bg-gray-100 dark:bg-gray-800 rounded-2xl" />)}
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Store size={20} className="text-gray-400" />
              </div>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">No services found</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Be the first to post a service in this category</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map(s => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  isOwn={s.seller_id === userId}
                  onEdit={svc => { setEditTarget(svc); setShowCreate(true); }}
                  onDelete={handleDelete}
                  onOrder={setOrderTarget}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* My Services tab */}
      {tab === 'mine' && (
        <>
          {myServices.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Sparkles size={20} className="text-blue-500" />
              </div>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No services yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-4">Post your first service and start earning</p>
              <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all active:scale-95">
                <Plus size={13} /> Post Service
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myServices.map(s => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  isOwn
                  onEdit={svc => { setEditTarget(svc); setShowCreate(true); }}
                  onDelete={handleDelete}
                  onOrder={() => {}}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* My Orders tab */}
      {tab === 'orders' && (
        <>
          {myOrders.length === 0 ? (
            <div className="text-center py-16">
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
                  <span className={`shrink-0 text-[10px] font-black uppercase px-2 py-1 rounded-full ${STATUS_COLOR[o.status] || STATUS_COLOR.pending}`}>
                    {o.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create / Edit modal */}
      {showCreate && (
        <Modal title={editTarget ? 'Edit Service' : 'Post a Service'} onClose={() => { setShowCreate(false); setEditTarget(null); }}>
          <ServiceForm
            initial={editTarget}
            saving={saving}
            onClose={() => { setShowCreate(false); setEditTarget(null); }}
            onSave={handleSaveService}
          />
        </Modal>
      )}

      {/* Order modal */}
      {orderTarget && (
        <Modal title="Place Order" onClose={() => setOrderTarget(null)}>
          <OrderForm
            service={orderTarget}
            saving={saving}
            onClose={() => setOrderTarget(null)}
            onOrder={handleOrder}
          />
        </Modal>
      )}

    </div>
  );
}
