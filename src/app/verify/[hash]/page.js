"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Shield, CheckCircle2, AlertTriangle, BadgeCheck, Copy, Check,
  Share2, ArrowLeft, Loader2, Crown, Award
} from "lucide-react";
import { supabase } from "../../supabaseClient";

const CRED_TYPE_BADGE = {
  Certificate: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  Badge:       "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  Achievement: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
};

function truncateHash(hash) {
  if (!hash || hash.length <= 20) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

export default function VerifyPage() {
  const { hash } = useParams();
  const [credential, setCredential] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [hashCopied, setHashCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  useEffect(() => {
    if (!hash) { setNotFound(true); setLoading(false); return; }
    const verify = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('credentials')
        .select('id, title, description, credential_type, blockchain_hash, issued_at, expires_at, is_tradeable, price, issuer:issuer_id(username, avatar_url, is_verified), profiles:user_id(id, username, avatar_url, is_verified, is_premium)')
        .eq('blockchain_hash', hash)
        .maybeSingle();
      setLoading(false);
      if (error || !data) { setNotFound(true); return; }
      setCredential(data);
    };
    verify();
  }, [hash]);

  const handleCopyHash = async () => {
    await navigator.clipboard.writeText(hash);
    setHashCopied(true);
    setTimeout(() => setHashCopied(false), 2000);
  };

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          <ArrowLeft size={16} /> beoneofus
        </Link>
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
          <Shield size={12} /> Credential Verification
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start px-4 py-10 sm:py-16">
        <div className="w-full max-w-lg space-y-6">

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 size={32} className="text-blue-500 animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Verifying credential...</p>
            </div>
          )}

          {!loading && notFound && (
            <div className="flex flex-col items-center justify-center py-10 text-center bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-2xl px-6">
              <AlertTriangle size={40} className="text-red-400 mb-4" />
              <h2 className="font-black text-red-700 dark:text-red-400 text-xl mb-2">Invalid or Revoked Credential</h2>
              <p className="text-sm text-red-500 dark:text-red-500/80 mb-2">The hash you provided does not match any credential in our system.</p>
              <p className="font-mono text-[11px] text-red-400 dark:text-red-600 break-all">{hash}</p>
            </div>
          )}

          {!loading && credential && (
            <>
              <div className="flex items-center gap-2 text-sm font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-xl px-4 py-3">
                <CheckCircle2 size={18} /> Credential verified successfully
              </div>

              <div className="relative rounded-2xl p-6 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/30 dark:via-yellow-950/30 dark:to-orange-950/20 border-2 border-amber-200 dark:border-amber-800/50 shadow-lg">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400/5 to-yellow-400/10 pointer-events-none" />

                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-black text-gray-900 dark:text-gray-100 text-xl leading-tight">{credential.title}</h2>
                    {credential.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{credential.description}</p>
                    )}
                  </div>
                  <span className={`shrink-0 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${CRED_TYPE_BADGE[credential.credential_type] || CRED_TYPE_BADGE.Certificate}`}>
                    {credential.credential_type || "Certificate"}
                  </span>
                </div>

                {credential.profiles && (
                  <div className="flex items-center gap-3 mb-4 p-3 bg-white/60 dark:bg-gray-900/40 rounded-xl border border-amber-100 dark:border-amber-900/30">
                    <div className="relative w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700">
                      {credential.profiles.avatar_url ? (
                        <Image src={credential.profiles.avatar_url} alt="holder" fill sizes="40px" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-400 uppercase">
                          {credential.profiles.username?.[0]}
                        </div>
                      )}
                      {credential.profiles.is_premium && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center border border-white dark:border-gray-900">
                          <Crown size={8} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Credential Holder</p>
                      <p className="text-sm font-black text-gray-900 dark:text-gray-100 flex items-center gap-1">
                        @{credential.profiles.username}
                        {credential.profiles.is_verified && <BadgeCheck size={14} className="text-blue-500" fill="currentColor" stroke="white" />}
                      </p>
                    </div>
                  </div>
                )}

                {credential.issuer && (
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="relative w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700">
                      {credential.issuer.avatar_url ? (
                        <Image src={credential.issuer.avatar_url} alt="issuer" fill sizes="32px" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400 uppercase">
                          {credential.issuer.username?.[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Issued by</p>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                        @{credential.issuer.username}
                        {credential.issuer.is_verified && <BadgeCheck size={12} className="text-blue-500" fill="currentColor" stroke="white" />}
                      </p>
                    </div>
                    {credential.issued_at && (
                      <span className="ml-auto text-[11px] text-gray-400 dark:text-gray-500">
                        {new Date(credential.issued_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </span>
                    )}
                  </div>
                )}

                <div className="bg-white/70 dark:bg-gray-900/50 rounded-xl px-3 py-2.5 flex items-center gap-2 mb-4 border border-amber-100 dark:border-amber-900/30">
                  <span className="font-mono text-[11px] text-gray-600 dark:text-gray-400 flex-1 truncate">{truncateHash(credential.blockchain_hash)}</span>
                  <button onClick={handleCopyHash} className="shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-1">
                    {hashCopied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 px-2.5 py-1 rounded-lg">
                    <Shield size={11} /> Verified on Chain
                  </span>
                  {credential.expires_at && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      Expires {new Date(credential.expires_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleCopyUrl}
                className="w-full flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
              >
                {urlCopied ? <Check size={16} className="text-green-500" /> : <Share2 size={16} />}
                {urlCopied ? "Link Copied!" : "Share Verification Link"}
              </button>
            </>
          )}

          <div className="text-center pt-4">
            <Link
              href="/dash/marketplace"
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
            >
              Back to Marketplace
            </Link>
            <span className="mx-2 text-gray-300 dark:text-gray-700">·</span>
            <Link
              href="/"
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
            >
              beoneofus.work
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
