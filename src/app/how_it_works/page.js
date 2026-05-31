"use client";

import Link from "next/link";
import {
  ShoppingCart, Package, Shield, Truck, CheckCircle2, Lock, RotateCcw,
  Star, Users, Leaf, Gem, Gift, Droplets, Wind, Sparkles, ArrowRight,
  Phone, ChevronRight,
} from "lucide-react";

const STEPS = [
  {
    n: "01",
    title: "Browse Our Products",
    desc: "Explore our full range of premium wellness, lingerie, couples, personal care, accessories, and body care products. Filter by category, sort by rating or price, and add your favourites to cart.",
    icon: <ShoppingCart size={28} />,
    color: "from-rose-500 to-pink-600",
    light: "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400",
    features: ["18 categories", "Real customer reviews", "Wishlist & save for later"],
  },
  {
    n: "02",
    title: "Checkout Securely",
    desc: "Our checkout is SSL-encrypted from start to finish. Pay by card, mobile money, or crypto. We never store your card details. Your bank statement will show a neutral, generic merchant name — not ours.",
    icon: <Lock size={28} />,
    color: "from-violet-500 to-purple-600",
    light: "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400",
    features: ["SSL encrypted", "Neutral bank statement", "Multiple payment methods"],
  },
  {
    n: "03",
    title: "Packed Discreetly",
    desc: "Every single order is packed in a plain, sealed brown or white box. There is no logo, no product name, no sticker — nothing that reveals what's inside. Our packing team follows strict confidentiality.",
    icon: <Package size={28} />,
    color: "from-emerald-500 to-teal-600",
    light: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    features: ["No brand on box", "No product description", "Plain label only"],
  },
  {
    n: "04",
    title: "Fast Delivery to Your Door",
    desc: "Order before 2pm and receive same-day delivery in eligible areas. Our riders are professional, uniformed (not branded), and trained to handle deliveries with complete discretion. Track live from dispatch.",
    icon: <Truck size={28} />,
    color: "from-blue-500 to-indigo-600",
    light: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
    features: ["Same-day delivery", "Live order tracking", "Discreet riders"],
  },
];

const CATEGORIES = [
  { icon: <Leaf size={18} />,     label: "Wellness",      desc: "Lubricants, enhancers, intimate health",      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" },
  { icon: <Gem size={18} />,      label: "Lingerie",       desc: "Underwear, bodysuits, corsets, sets",          color: "text-pink-500 bg-pink-50 dark:bg-pink-500/10" },
  { icon: <Users size={18} />,    label: "For Couples",    desc: "Games, kits, wearable sets, dice",             color: "text-violet-500 bg-violet-50 dark:bg-violet-500/10" },
  { icon: <Droplets size={18} />, label: "Personal Care",  desc: "Massagers, vibrators, air-pulse devices",     color: "text-rose-500 bg-rose-50 dark:bg-rose-500/10" },
  { icon: <Gift size={18} />,     label: "Accessories",    desc: "Blindfolds, restraints, ticklers",             color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10" },
  { icon: <Wind size={18} />,     label: "Body Care",      desc: "Oils, candles, scrubs, massage sets",          color: "text-amber-500 bg-amber-50 dark:bg-amber-500/10" },
];

const TRUST = [
  { icon: <Shield size={22} className="text-emerald-500" />,  title: "Always Discreet",     desc: "Plain unmarked packaging on every order. No logo, no product name — guaranteed." },
  { icon: <Truck size={22} className="text-blue-500" />,      title: "Same-Day Delivery",   desc: "Order before 2pm for same-day delivery. Live tracking from dispatch to door." },
  { icon: <Lock size={22} className="text-violet-500" />,     title: "Secure Payments",     desc: "SSL encrypted checkout. Neutral bank statement. Multiple payment options." },
  { icon: <RotateCcw size={22} className="text-rose-500" />,  title: "Free Returns",        desc: "Return any unopened item within 30 days, no questions asked, free of charge." },
  { icon: <Star size={22} className="text-amber-500" />,      title: "Verified Reviews",    desc: "All product reviews are from verified buyers only — honest and unfiltered." },
  { icon: <Phone size={22} className="text-teal-500" />,      title: "24/7 Support",        desc: "Our discreet support team is available around the clock by chat or phone." },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#09090b] text-gray-900 dark:text-gray-100 font-sans overflow-x-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
        .fade-up { animation: fadeUp 0.4s ease-out forwards; }
      `}} />

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-[#09090b]/95 backdrop-blur-xl border-b border-gray-200/60 dark:border-white/[0.06] px-4 sm:px-6 h-14 flex items-center">
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-600 flex items-center justify-center">
              <Sparkles size={13} className="text-white" />
            </div>
            <span className="font-black text-sm text-gray-900 dark:text-white">Discreet<span className="text-rose-600">Shop</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/orders" className="hidden sm:flex text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors px-3 py-2">
              My Orders
            </Link>
            <Link href="/shop" className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black transition-all active:scale-95 shadow-sm shadow-rose-600/25">
              <ShoppingCart size={13} /> Shop Now
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="bg-gradient-to-br from-gray-900 via-rose-950 to-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)', backgroundSize: '20px 20px' }} />
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-widest mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Quick, Discreet, Delivered
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
            How Our Service<br className="hidden sm:block" /> <span className="text-rose-400">Works</span>
          </h1>
          <p className="text-gray-300 text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-8">
            Premium adult products delivered to your door, fast and completely discreetly — no need to leave home.
          </p>
          <Link href="/shop"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-rose-600/30 text-sm">
            Start Shopping <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-16">

        {/* ── STEPS ── */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">4 Simple Steps</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">From browsing to delivery — everything designed for your privacy.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {STEPS.map((step, i) => (
              <div key={step.n} className="fade-up relative bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/[0.05] rounded-3xl overflow-hidden hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/30 hover:-translate-y-0.5 transition-all duration-200"
                style={{ animationDelay: `${i * 80}ms` }}>
                <div className={`h-1.5 bg-gradient-to-r ${step.color}`} />
                <div className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${step.light}`}>
                      {step.icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">Step {step.n}</p>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white mt-0.5 leading-tight">{step.title}</h3>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">{step.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {step.features.map(f => (
                      <span key={f} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] px-2.5 py-1 rounded-full">
                        <CheckCircle2 size={10} className="text-emerald-500" /> {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CATEGORIES ── */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">Our Product Categories</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Everything clearly classified so you find exactly what you need.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {CATEGORIES.map(cat => (
              <Link key={cat.label} href={`/shop?cat=${cat.label.toLowerCase().replace(' ','_')}`}
                className="group flex flex-col items-center gap-3 p-4 bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/[0.05] rounded-2xl hover:shadow-lg hover:-translate-y-0.5 transition-all text-center">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${cat.color}`}>{cat.icon}</div>
                <div>
                  <p className="text-sm font-black text-gray-900 dark:text-white">{cat.label}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5 leading-snug">{cat.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── TRUST ── */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">Our Guarantees</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Every promise we make, we keep — on every single order.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TRUST.map(t => (
              <div key={t.title} className="flex gap-4 p-5 bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/[0.05] rounded-2xl">
                <div className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/[0.04] flex items-center justify-center shrink-0">{t.icon}</div>
                <div>
                  <p className="font-black text-gray-900 dark:text-white">{t.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 sm:p-12 text-white text-center">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)', backgroundSize: '20px 20px' }} />
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-widest mb-5">
              <Shield size={11} className="text-emerald-400" /> 100% Discreet · Fast · Secure
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mb-3 tracking-tight">Ready to Shop?</h2>
            <p className="text-gray-300 max-w-lg mx-auto mb-7 leading-relaxed text-sm">
              Browse our full range of premium products. Same-day delivery available. Plain packaging on every order.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/shop" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-rose-600/30 text-sm">
                <ShoppingCart size={16} /> Browse All Products
              </Link>
              <Link href="/orders" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-2xl transition-all text-sm">
                <Package size={16} /> View My Orders
              </Link>
            </div>
          </div>
        </section>
      </div>

      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0d0d0f] py-8 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-rose-600 flex items-center justify-center">
              <Sparkles size={11} className="text-white" />
            </div>
            <span className="font-black text-sm text-gray-900 dark:text-white">Discreet<span className="text-rose-600">Shop</span></span>
          </div>
          <div className="flex flex-wrap justify-center gap-5">
            {[
              { href: '/shop', label: 'Shop' },
              { href: '/orders', label: 'Orders' },
              { href: '/how_it_works', label: 'How It Works' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors font-medium">{label}</Link>
            ))}
          </div>
          <p className="text-xs text-gray-400">18+ Only · {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
