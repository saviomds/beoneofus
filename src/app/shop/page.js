"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../supabaseClient';
import { createPortal } from 'react-dom';
import {
  ShoppingCart, X, Plus, Minus, Search, Shield, Truck, Lock, RotateCcw,
  Star, Heart, Package, Clock, Eye, CheckCircle2, Sparkles, Tag, AlertTriangle,
  ChevronRight, Zap, BadgeCheck, Filter, SortDesc, ArrowRight, Flame,
  Gift, Leaf, Users, Gem, Wind, Droplets, ChevronDown,
} from 'lucide-react';

// ── Data ──────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'all',         label: 'All Products',   icon: <Sparkles size={15} /> },
  { id: 'wellness',    label: 'Wellness',        icon: <Leaf size={15} /> },
  { id: 'lingerie',    label: 'Lingerie',        icon: <Gem size={15} /> },
  { id: 'couples',     label: 'For Couples',     icon: <Users size={15} /> },
  { id: 'personal',    label: 'Personal Care',   icon: <Droplets size={15} /> },
  { id: 'accessories', label: 'Accessories',     icon: <Gift size={15} /> },
  { id: 'bodycare',    label: 'Body Care',       icon: <Wind size={15} /> },
];

const PRODUCTS = [
  {
    id: 1, category: 'personal', name: 'Deluxe Wellness Wand Pro',
    price: 89.99, originalPrice: 119.99, badge: 'Best Seller', badgeColor: 'rose',
    rating: 4.8, reviews: 342,
    desc: 'Premium personal massager with 10 vibration modes. Whisper-quiet motor, fully waterproof, USB-C rechargeable. Arrives in plain sealed box.',
    tags: ['Waterproof', 'Rechargeable', 'Whisper-quiet'],
    color: 'violet', deliveryTag: '24h delivery',
  },
  {
    id: 2, category: 'personal', name: 'Compact Personal Massager',
    price: 49.99, badge: null,
    rating: 4.7, reviews: 198,
    desc: 'Travel-sized personal massager. USB rechargeable, discreet lipstick design, 7 intensity levels. Fits in any bag.',
    tags: ['Travel-size', 'USB-C', 'Discreet design'],
    color: 'rose', deliveryTag: '24h delivery',
  },
  {
    id: 3, category: 'personal', name: 'Air-Pulse Stimulator',
    price: 119.99, originalPrice: 149.99, badge: 'New', badgeColor: 'emerald',
    rating: 4.9, reviews: 87,
    desc: 'Next-generation contactless air-pulse technology. 11 intensity settings, waterproof, medical-grade silicone.',
    tags: ['Air-pulse', 'Medical-grade', 'Waterproof'],
    color: 'indigo', deliveryTag: 'Express available',
  },
  {
    id: 4, category: 'lingerie', name: 'Satin Lace Ensemble',
    price: 39.99, originalPrice: 55.00, badge: 'Sale', badgeColor: 'amber',
    rating: 4.6, reviews: 156,
    desc: 'Luxurious satin and lace set. Available in sizes XS–3XL. Soft, breathable, and beautifully packaged.',
    tags: ['Inclusive sizing', 'Satin', 'Gift-ready'],
    color: 'pink', deliveryTag: '24h delivery',
  },
  {
    id: 5, category: 'lingerie', name: 'Sheer Mesh Bodysuit',
    price: 44.99, badge: null,
    rating: 4.5, reviews: 89,
    desc: 'Elegant mesh bodysuit with adjustable straps and hook closure. Available in 6 colors, sizes XS–2XL.',
    tags: ['6 color options', 'Adjustable', 'All sizes'],
    color: 'purple', deliveryTag: '24h delivery',
  },
  {
    id: 6, category: 'lingerie', name: 'Premium Corset Set',
    price: 64.99, badge: null,
    rating: 4.7, reviews: 203,
    desc: 'Steel-boned corset with matching briefs. Boned for real shaping, steel-busk front, modesty panel.',
    tags: ['Steel-boned', 'Matching set', 'Shapewear'],
    color: 'rose', deliveryTag: '48h delivery',
  },
  {
    id: 7, category: 'wellness', name: 'Premium Lubricant Collection',
    price: 29.99, badge: 'Top Rated', badgeColor: 'emerald',
    rating: 4.9, reviews: 512,
    desc: '3-piece lubricant set — water-based, silicone-blend, and warming formula. All body-safe, dermatologist tested.',
    tags: ['Body-safe', 'Dermatologist tested', '3-pack'],
    color: 'emerald', deliveryTag: '24h delivery',
  },
  {
    id: 8, category: 'wellness', name: 'Intimacy Enhancer Serum',
    price: 24.99, badge: null,
    rating: 4.7, reviews: 203,
    desc: 'Natural botanical sensitivity formula. Hypoallergenic, paraben-free, vegan. Fast-absorbing, no sticky residue.',
    tags: ['Natural', 'Paraben-free', 'Vegan'],
    color: 'teal', deliveryTag: '24h delivery',
  },
  {
    id: 9, category: 'wellness', name: 'pH Balance Wash',
    price: 18.99, badge: null,
    rating: 4.8, reviews: 341,
    desc: 'Gentle intimate wash with prebiotics. Maintains healthy pH, fragrance-free, gynaecologist approved.',
    tags: ['pH-balanced', 'Prebiotics', 'Fragrance-free'],
    color: 'teal', deliveryTag: '24h delivery',
  },
  {
    id: 10, category: 'couples', name: 'Intimacy Card Game',
    price: 22.99, badge: 'Popular', badgeColor: 'amber',
    rating: 4.8, reviews: 441,
    desc: '150 conversation cards and playful dares for couples. Build deeper connection and playfulness. Waterproof cards.',
    tags: ['150 cards', 'Waterproof', 'Gift-ready'],
    color: 'amber', deliveryTag: '24h delivery',
  },
  {
    id: 11, category: 'couples', name: 'Couples Pleasure Kit',
    price: 79.99, originalPrice: 110.00, badge: 'Bundle', badgeColor: 'violet',
    rating: 4.9, reviews: 267,
    desc: 'Curated 5-piece couples set: massage oil, silk blindfold, feather tickler, intimacy dice, and guide booklet.',
    tags: ['5-piece set', 'Gift box', 'Beginner-friendly'],
    color: 'rose', deliveryTag: 'Express available',
  },
  {
    id: 12, category: 'couples', name: 'Remote Control Duo',
    price: 69.99, badge: 'New', badgeColor: 'emerald',
    rating: 4.6, reviews: 134,
    desc: 'Couples wearable set with smartphone app control. Up to 30ft range, whisper-quiet, rechargeable pair.',
    tags: ['App-controlled', 'Wearable', '30ft range'],
    color: 'indigo', deliveryTag: '24h delivery',
  },
  {
    id: 13, category: 'accessories', name: 'Silk Blindfold & Cuffs Set',
    price: 34.99, badge: null,
    rating: 4.6, reviews: 178,
    desc: 'Pure silk blindfold with matching wrist cuffs. Adjustable buckle, elegantly boxed with satin ribbon.',
    tags: ['Pure silk', 'Adjustable', 'Gift packaged'],
    color: 'indigo', deliveryTag: '24h delivery',
  },
  {
    id: 14, category: 'accessories', name: 'Satin Restraint Set',
    price: 29.99, badge: null,
    rating: 4.5, reviews: 134,
    desc: 'Beginner-friendly satin restraint set with quick-release safety buckle. Padded for comfort.',
    tags: ['Quick-release', 'Beginner', 'Padded'],
    color: 'violet', deliveryTag: '24h delivery',
  },
  {
    id: 15, category: 'accessories', name: 'Tickler & Paddle Set',
    price: 19.99, badge: null,
    rating: 4.4, reviews: 98,
    desc: 'Vegan feather tickler and faux-leather paddle set. Great for beginners. Packaged in a discrete gift box.',
    tags: ['Vegan', 'Beginner', 'Gift-boxed'],
    color: 'rose', deliveryTag: '24h delivery',
  },
  {
    id: 16, category: 'bodycare', name: 'Sensual Body Oil Set',
    price: 44.99, badge: 'New', badgeColor: 'amber',
    rating: 4.8, reviews: 389,
    desc: 'Three warming massage oils: rose, vanilla, and jasmine. 100% natural ingredients, skin-nourishing blend.',
    tags: ['100% natural', 'Warming', '3 scents'],
    color: 'amber', deliveryTag: '24h delivery',
  },
  {
    id: 17, category: 'bodycare', name: 'Aromatherapy Candle Set',
    price: 32.99, badge: null,
    rating: 4.7, reviews: 221,
    desc: 'Set of 3 soy wax candles in jasmine, sandalwood, and vanilla. 50-hour burn time each. Phthalate-free.',
    tags: ['Soy wax', '50hr burn', 'Set of 3'],
    color: 'yellow', deliveryTag: '24h delivery',
  },
  {
    id: 18, category: 'bodycare', name: 'Full Body Scrub Kit',
    price: 37.99, badge: null,
    rating: 4.6, reviews: 167,
    desc: 'Sugar scrub + body butter duo. Exfoliates, hydrates, and leaves skin silky smooth. Vegan, cruelty-free.',
    tags: ['Vegan', 'Cruelty-free', 'Duo set'],
    color: 'teal', deliveryTag: '24h delivery',
  },
];

const SORT_OPTIONS = [
  { value: 'popular',  label: 'Most Popular' },
  { value: 'price-asc', label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
  { value: 'rating',   label: 'Highest Rated' },
];

const COLOR = {
  violet: { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400', btn: 'bg-violet-600 hover:bg-violet-500', light: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' },
  rose:   { bg: 'bg-rose-50 dark:bg-rose-900/20',     text: 'text-rose-600 dark:text-rose-400',     btn: 'bg-rose-600 hover:bg-rose-500',     light: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' },
  pink:   { bg: 'bg-pink-50 dark:bg-pink-900/20',     text: 'text-pink-600 dark:text-pink-400',     btn: 'bg-pink-600 hover:bg-pink-500',     light: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', btn: 'bg-purple-600 hover:bg-purple-500', light: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
  emerald:{ bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', btn: 'bg-emerald-600 hover:bg-emerald-500', light: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
  teal:   { bg: 'bg-teal-50 dark:bg-teal-900/20',     text: 'text-teal-600 dark:text-teal-400',     btn: 'bg-teal-600 hover:bg-teal-500',     light: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' },
  amber:  { bg: 'bg-amber-50 dark:bg-amber-900/20',   text: 'text-amber-600 dark:text-amber-400',   btn: 'bg-amber-500 hover:bg-amber-400',   light: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400', btn: 'bg-indigo-600 hover:bg-indigo-500', light: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' },
  yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400', btn: 'bg-yellow-500 hover:bg-yellow-400', light: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
};

const BADGE_COLOR = {
  rose:    'bg-rose-500 text-white',
  emerald: 'bg-emerald-500 text-white',
  amber:   'bg-amber-500 text-white',
  violet:  'bg-violet-600 text-white',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function Stars({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={11} fill={s <= Math.round(rating) ? 'currentColor' : 'none'}
          className={s <= Math.round(rating) ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'} />
      ))}
    </div>
  );
}

// ── Age Gate ─────────────────────────────────────────────────────────────────

function AgeGate({ onConfirm, onDecline }) {
  return (
    <div className="fixed inset-0 z-[999] bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#0f0f12] border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle size={28} className="text-rose-400" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">18+ Only</h2>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          This store contains adult products intended for individuals 18 years of age or older. By entering, you confirm you are of legal age in your jurisdiction.
        </p>
        <div className="space-y-3">
          <button onClick={onConfirm}
            className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl transition-all active:scale-95 text-sm">
            I am 18 or older — Enter
          </button>
          <button onClick={onDecline}
            className="w-full py-3.5 bg-white/[0.05] hover:bg-white/[0.09] text-gray-400 font-bold rounded-2xl transition-all text-sm border border-white/[0.07]">
            I am under 18 — Leave
          </button>
        </div>
        <p className="text-[10px] text-gray-600 mt-5 leading-relaxed">
          By entering, you agree to our Terms of Service and confirm this is a legal activity in your location.
        </p>
      </div>
    </div>
  );
}

// ── Cart Panel ────────────────────────────────────────────────────────────────

function CartPanel({ cart, open, onClose, onQtyChange, onRemove, onCheckout }) {
  const total   = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const itemCnt = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <>
      {open && <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={onClose} />}
      <aside className={`fixed top-0 right-0 h-full w-full max-w-sm z-[70] bg-white dark:bg-[#0f0f12] border-l border-gray-200 dark:border-white/[0.07] flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'} shadow-2xl`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <ShoppingCart size={18} className="text-rose-500" />
            <h2 className="font-black text-gray-900 dark:text-white">Cart</h2>
            <span className="text-[10px] font-black bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full">{itemCnt} item{itemCnt !== 1 ? 's' : ''}</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-white/[0.03] flex items-center justify-center mb-4">
                <ShoppingCart size={26} className="text-gray-300 dark:text-gray-700" />
              </div>
              <p className="font-black text-gray-500 dark:text-gray-400 text-sm">Your cart is empty</p>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Add products to get started</p>
            </div>
          ) : (
            cart.map(item => {
              const c = COLOR[item.color] || COLOR.rose;
              return (
                <div key={item.id} className="flex gap-3 p-3 bg-gray-50 dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/[0.04]">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${c.bg}`}>
                    <span className={`text-lg ${c.text}`}>✦</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-snug line-clamp-1">{item.name}</p>
                    <p className="text-xs font-black text-rose-600 dark:text-rose-400 mt-0.5">${(item.price * item.qty).toFixed(2)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => onQtyChange(item.id, item.qty - 1)}
                        className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-white/[0.07] flex items-center justify-center hover:bg-gray-300 dark:hover:bg-white/[0.12] transition-colors">
                        <Minus size={10} />
                      </button>
                      <span className="text-xs font-black w-5 text-center text-gray-900 dark:text-white">{item.qty}</span>
                      <button onClick={() => onQtyChange(item.id, item.qty + 1)}
                        className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-white/[0.07] flex items-center justify-center hover:bg-gray-300 dark:hover:bg-white/[0.12] transition-colors">
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                  <button onClick={() => onRemove(item.id)} className="shrink-0 text-gray-300 dark:text-gray-700 hover:text-rose-500 transition-colors mt-1">
                    <X size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-gray-100 dark:border-white/[0.06] space-y-3">
            {/* Discreet badge */}
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
              <Shield size={13} className="text-emerald-500 shrink-0" />
              <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">Plain, unmarked packaging. No brand name on box or receipt.</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Subtotal</span>
              <span className="text-lg font-black text-gray-900 dark:text-white">${total.toFixed(2)}</span>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-600">Shipping calculated at checkout. Free over $60.</p>
            <button onClick={onCheckout}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl transition-all active:scale-[0.98] text-sm shadow-lg shadow-rose-600/20">
              Checkout Securely <Lock size={13} className="inline ml-1" />
            </button>
            <Link href="/orders"
              className="block text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors font-bold">
              View my orders →
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}

// ── Quick View Modal ──────────────────────────────────────────────────────────

function QuickViewModal({ product, onClose, onAdd }) {
  if (!product) return null;
  const c = COLOR[product.color] || COLOR.rose;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-white dark:bg-[#141416] border border-gray-200 dark:border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Colour band */}
        <div className={`h-1.5 w-full ${c.btn}`} />
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-400 transition-colors z-10">
          <X size={16} />
        </button>
        <div className="p-6 sm:p-7">
          <div className="flex items-start gap-4 mb-5">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${c.bg} text-3xl`}>✦</div>
            <div className="flex-1 min-w-0">
              {product.badge && (
                <span className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full mb-1.5 ${BADGE_COLOR[product.badgeColor] || 'bg-gray-200 text-gray-700'}`}>{product.badge}</span>
              )}
              <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">{product.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Stars rating={product.rating} />
                <span className="text-[11px] text-gray-400 font-medium">{product.rating} ({product.reviews} reviews)</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-5">{product.desc}</p>
          <div className="flex flex-wrap gap-1.5 mb-5">
            {product.tags.map(t => (
              <span key={t} className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${c.light}`}>{t}</span>
            ))}
          </div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <span className="text-2xl font-black text-gray-900 dark:text-white">${product.price.toFixed(2)}</span>
              {product.originalPrice && (
                <span className="ml-2 text-sm text-gray-400 line-through">${product.originalPrice.toFixed(2)}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <Truck size={12} /> {product.deliveryTag}
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/[0.04] mb-4">
            <Shield size={13} className="text-emerald-500 shrink-0" />
            <p className="text-[11px] font-bold text-gray-600 dark:text-gray-400">Discreet packaging — no brand name on box, invoice, or bank statement.</p>
          </div>
          <button onClick={() => { onAdd(product); onClose(); }}
            className={`w-full py-3.5 text-white font-black rounded-2xl transition-all active:scale-[0.98] text-sm ${c.btn} shadow-lg`}>
            <ShoppingCart size={15} className="inline mr-2" /> Add to Cart
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ msg, visible }) {
  return (
    <div className={`fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-[90] transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
      <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl shadow-2xl text-sm font-bold">
        <CheckCircle2 size={16} className="text-emerald-400 dark:text-emerald-600 shrink-0" /> {msg}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ShopPage() {
  const router = useRouter();
  const [mounted, setMounted]           = useState(false);
  const [ageVerified, setAgeVerified]   = useState(false);
  const [cart, setCart]                 = useState([]);
  const [cartOpen, setCartOpen]         = useState(false);
  const [category, setCategory]         = useState('all');
  const [search, setSearch]             = useState('');
  const [sort, setSort]                 = useState('popular');
  const [wishlist, setWishlist]         = useState([]);
  const [quickView, setQuickView]       = useState(null);
  const [toast, setToast]               = useState({ msg: '', visible: false });
  const [sortOpen, setSortOpen]         = useState(false);
  const [checkingOut, setCheckingOut]   = useState(false);
  const toastTimer                      = useRef(null);

  useEffect(() => {
    setMounted(true);
    const verified = localStorage.getItem('shop_age_verified');
    if (verified === 'true') setAgeVerified(true);
    const saved = localStorage.getItem('shop_cart');
    if (saved) { try { setCart(JSON.parse(saved)); } catch {} }
    const wl = localStorage.getItem('shop_wishlist');
    if (wl) { try { setWishlist(JSON.parse(wl)); } catch {} }
  }, []);

  // Persist cart + wishlist
  useEffect(() => { if (mounted) localStorage.setItem('shop_cart', JSON.stringify(cart)); }, [cart, mounted]);
  useEffect(() => { if (mounted) localStorage.setItem('shop_wishlist', JSON.stringify(wishlist)); }, [wishlist, mounted]);

  const showToast = useCallback((msg) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, visible: true });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500);
  }, []);

  const addToCart = useCallback((product) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === product.id);
      if (exists) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
    showToast(`${product.name} added to cart`);
  }, [showToast]);

  const changeQty = useCallback((id, qty) => {
    if (qty < 1) { setCart(prev => prev.filter(i => i.id !== id)); return; }
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  }, []);

  const toggleWishlist = useCallback((id) => {
    setWishlist(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  // Filter + sort
  const displayed = PRODUCTS
    .filter(p => category === 'all' || p.category === category)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.tags.some(t => t.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => {
      if (sort === 'price-asc')  return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      if (sort === 'rating')     return b.rating - a.rating;
      return b.reviews - a.reviews; // popular
    });

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  if (!mounted) return null;

  if (!ageVerified) {
    return (
      <AgeGate
        onConfirm={() => { localStorage.setItem('shop_age_verified', 'true'); setAgeVerified(true); }}
        onDecline={() => router.push('/')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#09090b] text-gray-900 dark:text-gray-100 font-sans">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        .fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .cat-scroll { display:flex; gap:8px; overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch; padding-bottom:2px; }
        .cat-scroll::-webkit-scrollbar { display:none; }
        .cat-scroll > * { flex-shrink:0; }
      `}} />

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-[#09090b]/95 backdrop-blur-xl border-b border-gray-200/60 dark:border-white/[0.06] px-4 sm:px-6 h-14 flex items-center">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dash" className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              <ChevronRight size={16} className="rotate-180" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-600 flex items-center justify-center">
                <Sparkles size={13} className="text-white" />
              </div>
              <span className="font-black text-sm text-gray-900 dark:text-white">Discreet<span className="text-rose-600">Shop</span></span>
              <span className="hidden sm:block text-[9px] font-black bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wider">18+</span>
            </div>
          </div>
          <div className="flex-1 max-w-xs hidden sm:block relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
              className="w-full pl-8 pr-3 py-2 text-xs bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-xl focus:outline-none focus:border-rose-400 dark:focus:border-rose-500/50 transition-colors text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600" />
          </div>
          <div className="flex items-center gap-2">
            <Link href="/orders" className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors px-3 py-2">
              <Package size={14} /> My Orders
            </Link>
            <button onClick={() => setCartOpen(true)} className="relative flex items-center gap-2 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black transition-all active:scale-95 shadow-sm shadow-rose-600/25">
              <ShoppingCart size={14} /> Cart
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-400 text-gray-900 text-[10px] font-black rounded-full flex items-center justify-center shadow">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="bg-gradient-to-br from-gray-900 via-rose-950 to-gray-900 text-white overflow-hidden relative">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)', backgroundSize: '20px 20px' }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
            <div className="text-center sm:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-widest mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 18+ Verified Store
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3 leading-tight">
                Shop Discreetly.<br className="hidden sm:block" />
                <span className="text-rose-400"> Delivered Fast.</span>
              </h1>
              <p className="text-gray-300 text-sm sm:text-base max-w-md leading-relaxed">
                Premium intimacy products delivered to your door in plain, unmarked packaging. No brand name — ever.
              </p>
              {/* Mobile search */}
              <div className="relative mt-4 sm:hidden">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
                  className="w-full pl-8 pr-3 py-2.5 text-sm bg-white/10 border border-white/15 rounded-xl focus:outline-none focus:border-rose-400 text-white placeholder-gray-400 transition-colors" />
              </div>
            </div>
            {/* Trust pills */}
            <div className="flex flex-wrap sm:flex-col gap-2 justify-center sm:justify-start shrink-0">
              {[
                { icon: <Shield size={13} />, label: 'Plain packaging' },
                { icon: <Truck size={13} />,  label: 'Same-day delivery' },
                { icon: <Lock size={13} />,   label: 'Encrypted checkout' },
                { icon: <RotateCcw size={13} />, label: 'Free 30-day returns' },
              ].map(t => (
                <div key={t.label} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-xs font-bold">
                  <span className="text-emerald-400">{t.icon}</span> {t.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS STRIP ── */}
      <div className="bg-white dark:bg-[#0d0d0f] border-b border-gray-100 dark:border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 overflow-x-auto">
          <div className="flex gap-6 min-w-max sm:min-w-0 sm:justify-center text-center">
            {[
              { n: '1', label: 'Browse & Add to Cart', color: 'text-rose-500' },
              { n: '2', label: 'Checkout Securely', color: 'text-violet-500' },
              { n: '3', label: 'Packaged Discreetly', color: 'text-emerald-500' },
              { n: '4', label: 'Delivered to Your Door', color: 'text-amber-500' },
            ].map(s => (
              <div key={s.n} className="flex items-center gap-2.5">
                <div className={`w-6 h-6 rounded-full border-2 ${s.color.replace('text-', 'border-')} flex items-center justify-center text-[10px] font-black ${s.color}`}>{s.n}</div>
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400 whitespace-nowrap">{s.label}</span>
                {s.n !== '4' && <ChevronRight size={13} className="text-gray-300 dark:text-gray-700" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── FILTERS ROW ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="cat-scroll w-full sm:w-auto">
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black border transition-all ${category === cat.id ? 'bg-rose-600 border-rose-600 text-white shadow-sm shadow-rose-600/20' : 'bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-600 dark:text-gray-400 hover:border-rose-300 dark:hover:border-rose-500/30'}`}>
                {cat.icon} {cat.label}
                {category === cat.id && category !== 'all' && (
                  <span className="text-[9px] font-black bg-white/20 px-1.5 py-px rounded-full">{displayed.length}</span>
                )}
              </button>
            ))}
          </div>
          <div className="relative shrink-0">
            <button onClick={() => setSortOpen(v => !v)}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:border-rose-300 dark:hover:border-rose-500/30 transition-all">
              <SortDesc size={13} /> {SORT_OPTIONS.find(s => s.value === sort)?.label} <ChevronDown size={12} className={`transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-10 bg-white dark:bg-[#141416] border border-gray-200 dark:border-white/[0.08] rounded-xl shadow-xl overflow-hidden w-44">
                {SORT_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => { setSort(opt.value); setSortOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${sort === opt.value ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04]'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── PRODUCT GRID ── */}
        {displayed.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <Search size={22} className="text-gray-400 dark:text-gray-600" />
            </div>
            <p className="font-black text-gray-500 dark:text-gray-400">No products found</p>
            <button onClick={() => { setSearch(''); setCategory('all'); }} className="mt-3 text-sm font-bold text-rose-500 hover:text-rose-600 transition-colors">Clear filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {displayed.map((product, idx) => {
              const c = COLOR[product.color] || COLOR.rose;
              const inWishlist = wishlist.includes(product.id);
              const savings = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : null;
              return (
                <div key={product.id} className="fade-in group bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/[0.05] rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/30 hover:-translate-y-0.5 transition-all duration-200"
                  style={{ animationDelay: `${idx * 30}ms` }}>
                  {/* Product image area */}
                  <div className={`relative h-32 sm:h-40 flex items-center justify-center ${c.bg}`}>
                    <span className={`text-4xl sm:text-5xl ${c.text} select-none`}>✦</span>
                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {product.badge && (
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${BADGE_COLOR[product.badgeColor] || 'bg-gray-700 text-white'}`}>{product.badge}</span>
                      )}
                      {savings && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white">{savings}% OFF</span>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => toggleWishlist(product.id)}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center shadow-sm transition-all ${inWishlist ? 'bg-rose-500 text-white' : 'bg-white dark:bg-[#111113] text-gray-400 hover:text-rose-500'}`}>
                        <Heart size={13} fill={inWishlist ? 'currentColor' : 'none'} />
                      </button>
                      <button onClick={() => setQuickView(product)}
                        className="w-7 h-7 rounded-xl bg-white dark:bg-[#111113] flex items-center justify-center shadow-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                        <Eye size={13} />
                      </button>
                    </div>
                    {/* Delivery tag */}
                    <div className="absolute bottom-2 right-2">
                      <span className="text-[9px] font-bold bg-white/90 dark:bg-black/60 text-emerald-600 dark:text-emerald-400 px-2 py-px rounded-full flex items-center gap-1">
                        <Zap size={8} /> {product.deliveryTag}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3 sm:p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-0.5">
                      {CATEGORIES.find(cat => cat.id === product.category)?.label}
                    </p>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white leading-snug line-clamp-2 mb-2">{product.name}</h3>
                    <div className="flex items-center gap-1.5 mb-3">
                      <Stars rating={product.rating} />
                      <span className="text-[10px] text-gray-400 font-medium">({product.reviews})</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {product.tags.slice(0, 2).map(t => (
                        <span key={t} className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${c.light}`}>{t}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-black text-gray-900 dark:text-white">${product.price.toFixed(2)}</span>
                        {product.originalPrice && (
                          <span className="ml-1 text-[10px] text-gray-400 line-through">${product.originalPrice.toFixed(2)}</span>
                        )}
                      </div>
                      <button onClick={() => addToCart(product)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 text-white text-[10px] font-black rounded-xl transition-all active:scale-95 ${c.btn}`}>
                        <Plus size={11} /> Add
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── SERVICES BANNER ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          {[
            { icon: <Shield size={20} className="text-emerald-500" />, title: 'Discreet Packaging', desc: 'Plain, unmarked boxes. No brand name on label, box, or receipt.' },
            { icon: <Truck size={20} className="text-blue-500" />,   title: 'Same-Day Delivery',  desc: 'Order before 2pm for same-day delivery in eligible areas.' },
            { icon: <Lock size={20} className="text-violet-500" />,  title: 'Encrypted Checkout', desc: 'SSL encrypted. We never store card details. Pay with card or crypto.' },
            { icon: <RotateCcw size={20} className="text-rose-500" />, title: 'Free 30-Day Returns', desc: 'Unopened items returned free, no questions asked.' },
          ].map(s => (
            <div key={s.title} className="flex gap-3 p-4 bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/[0.05] rounded-2xl">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/[0.04] flex items-center justify-center">{s.icon}</div>
              <div>
                <p className="text-sm font-black text-gray-900 dark:text-white">{s.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── LEGAL NOTE ── */}
        <p className="text-center text-[11px] text-gray-400 dark:text-gray-600 pb-4">
          All products are for adults 18+ only. By purchasing, you confirm you are of legal age in your jurisdiction. <Link href="/orders" className="text-rose-500 hover:text-rose-600 font-bold">View my orders →</Link>
        </p>
      </div>

      {/* Floating cart button on mobile */}
      {cartCount > 0 && (
        <button onClick={() => setCartOpen(true)}
          className="sm:hidden fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl shadow-xl shadow-rose-600/30 font-black text-sm transition-all hover:scale-105 active:scale-95">
          <ShoppingCart size={17} /> {cartCount} item{cartCount !== 1 ? 's' : ''} — ${cart.reduce((s,i)=>s+i.price*i.qty,0).toFixed(2)}
        </button>
      )}

      <CartPanel cart={cart} open={cartOpen} onClose={() => setCartOpen(false)}
        onQtyChange={changeQty} onRemove={id => setCart(prev => prev.filter(i => i.id !== id))}
        onCheckout={async () => {
          if (checkingOut || cart.length === 0) return;
          setCheckingOut(true);
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              router.push('/auth?next=/shop');
              return;
            }
            const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
            const items = cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, color: i.color }));
            await fetch('/api/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({ items, total }),
            });
            // Clear cart then redirect
            setCart([]);
            localStorage.removeItem('shop_cart');
            setCartOpen(false);
            router.push('/orders?checkout=1');
          } catch {
            // Non-fatal: still redirect so user sees confirmation
            setCartOpen(false);
            router.push('/orders?checkout=1');
          } finally {
            setCheckingOut(false);
          }
        }} />

      <QuickViewModal product={quickView} onClose={() => setQuickView(null)} onAdd={addToCart} />

      <Toast msg={toast.msg} visible={toast.visible} />
    </div>
  );
}
