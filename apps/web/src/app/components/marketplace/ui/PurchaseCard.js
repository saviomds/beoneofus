"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Heart, Share2, ShieldCheck, Zap, Download, RefreshCw } from "lucide-react";
import { supabase } from "../../../supabaseClient";
import { cn, compact } from "./lib";
import Button from "./Button";
import Price from "./Price";

// Sticky purchase card. Wires to the real, secured flows:
//  • free  → user_library insert (auth-gated)
//  • paid  → /api/paystack/marketplace/{initiate,verify} + Paystack inline
export default function PurchaseCard({ product, className = "" }) {
  const free = !product.price || product.price <= 0;
  const [owned, setOwned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [needAuth, setNeedAuth] = useState(false);
  const [msg, setMsg] = useState(null);
  const [paystackReady, setPaystackReady] = useState(false);

  const toast = (m) => { setMsg(m); setTimeout(() => setMsg(null), 3200); };

  // Ownership check (after await → not a synchronous effect setState).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || cancelled) return;
      const { data } = await supabase
        .from("user_library")
        .select("listing_id")
        .eq("user_id", session.user.id)
        .eq("listing_id", product.id)
        .maybeSingle();
      if (!cancelled) setOwned(!!data);
    })();
    return () => { cancelled = true; };
  }, [product.id]);

  // Lazy-load Paystack inline script (paid items only). Deferred so no
  // synchronous setState runs during the effect pass.
  useEffect(() => {
    if (free || typeof window === "undefined") return;
    let cancelled = false;
    const markReady = () => { if (!cancelled) setPaystackReady(true); };
    if (window.PaystackPop) { queueMicrotask(markReady); return () => { cancelled = true; }; }
    let s = document.getElementById("paystack-mkt-script");
    if (!s) {
      s = document.createElement("script");
      s.id = "paystack-mkt-script";
      s.src = "https://js.paystack.co/v1/inline.js";
      document.body.appendChild(s);
    }
    s.addEventListener("load", markReady);
    return () => { cancelled = true; s?.removeEventListener("load", markReady); };
  }, [free]);

  const acquire = async () => {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setNeedAuth(true); return; }
    if (owned) return;

    // Free → straight to library.
    if (free) {
      setBusy(true);
      const { error } = await supabase.from("user_library").insert({ user_id: session.user.id, listing_id: product.id });
      setBusy(false);
      if (!error) { setOwned(true); toast("Added to your library ✓"); }
      else toast(error.message || "Could not add to library");
      return;
    }

    // Paid → Paystack.
    if (!paystackReady || !window.PaystackPop) { toast("Payment is still loading — try again in a moment"); return; }
    setBusy(true);
    try {
      const initRes = await fetch("/api/paystack/marketplace/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ listingId: product.id, email: session.user.email }),
      });
      const init = await initRes.json();
      if (!initRes.ok) throw new Error(init.error || "Could not start payment");

      const handler = window.PaystackPop.setup({
        key: init.publicKey,
        email: session.user.email,
        amount: init.amount,
        currency: init.currency,
        ref: init.reference,
        callback: (resp) => {
          (async () => {
            try {
              const vRes = await fetch("/api/paystack/marketplace/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ reference: resp.reference, listingId: product.id }),
              });
              const v = await vRes.json();
              if (vRes.ok) { setOwned(true); toast("Purchase complete — it's in your library"); }
              else toast(v.error || "Payment verification failed");
            } finally { setBusy(false); }
          })();
        },
        onClose: () => setBusy(false),
      });
      handler.openIframe();
    } catch (e) {
      toast(e.message || "Payment error");
      setBusy(false);
    }
  };

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) { try { await navigator.share({ title: product.title, url }); } catch { /* dismissed */ } }
    else { try { await navigator.clipboard.writeText(url); toast("Link copied to clipboard"); } catch { toast(url); } }
  };

  return (
    <div className={cn("rounded-mkt border border-mkt-border bg-mkt-card p-5 shadow-[0_20px_50px_-30px_rgba(109,93,246,0.5)]", className)}>
      <Price value={product.price} original={product.originalPrice} currency={product.currency} size="lg" />

      <div className="mt-4 flex gap-2">
        {owned ? (
          <Button variant="secondary" size="lg" icon={Check} className="flex-1" disabled>In your library</Button>
        ) : (
          <Button size="lg" icon={free ? Download : Zap} className="flex-1" loading={busy} onClick={acquire}>
            {free ? "Add to Library" : "Get now"}
          </Button>
        )}
        <button
          type="button"
          onClick={() => setSaved((s) => !s)}
          aria-pressed={saved}
          aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
          className="grid h-13 w-13 shrink-0 place-items-center rounded-2xl border border-mkt-border text-mkt-muted transition hover:text-mkt-text mkt-focus"
        >
          <Heart size={20} className={cn(saved && "fill-rose-500 text-rose-500")} />
        </button>
      </div>

      {owned && (
        <Link href="/dash/market" className="mt-2 block text-center text-[13px] font-semibold text-mkt-primary hover:underline">
          Open in your library →
        </Link>
      )}

      <button type="button" onClick={share} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-mkt-border py-2.5 text-[13px] font-semibold text-mkt-muted transition hover:text-mkt-text mkt-focus">
        <Share2 size={15} /> Share
      </button>

      {needAuth && (
        <p className="mt-3 rounded-xl bg-mkt-warning/10 px-3 py-2 text-center text-[13px] text-mkt-warning">
          Please <Link href="/auth" className="font-bold underline">sign in</Link> to continue.
        </p>
      )}
      {msg && <p className="mt-3 rounded-xl bg-mkt-bg-2 px-3 py-2 text-center text-[13px] text-mkt-text">{msg}</p>}

      {/* trust row */}
      <ul className="mt-5 space-y-2 border-t border-mkt-border pt-4 text-[13px] text-mkt-muted">
        <li className="flex items-center gap-2"><ShieldCheck size={15} className="text-mkt-success" /> Secure checkout via Paystack</li>
        <li className="flex items-center gap-2"><Zap size={15} className="text-mkt-gold" /> Instant access after purchase</li>
        <li className="flex items-center gap-2"><RefreshCw size={15} className="text-mkt-secondary" /> Free lifetime updates</li>
        {product.downloads != null && (
          <li className="flex items-center gap-2"><Download size={15} className="text-mkt-primary" /> {compact(product.downloads)} downloads</li>
        )}
      </ul>
    </div>
  );
}
