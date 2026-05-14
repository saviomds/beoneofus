"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Award, Terminal, Download, Share2, CheckCircle2,
  Loader2, ExternalLink, Copy, Check, ShieldCheck,
} from "lucide-react";
import { supabase } from "../../supabaseClient";

export default function CertificatePage() {
  const params = useParams();
  const certId = params.id;

  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchCert = async () => {
      // Try with explicit FK hint first, fall back to plain join
      let data = null;

      const attempts = [
        `id, issued_at, user_id, course_id,
         courses(title, category, level, description, duration, lessons),
         profiles!user_certificates_user_id_fkey(username, full_name, avatar_url, work_status)`,
        `id, issued_at, user_id, course_id,
         courses(title, category, level, description, duration, lessons),
         profiles(username, full_name, avatar_url, work_status)`,
        `id, issued_at, user_id, course_id`,
      ];

      for (const selectStr of attempts) {
        const { data: row, error } = await supabase
          .from("user_certificates")
          .select(selectStr)
          .eq("id", certId)
          .single();
        if (!error && row) { data = row; break; }
        if (error) console.warn("cert fetch attempt failed:", error.message);
      }

      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // If profiles join didn't resolve, fetch separately
      if (!data.profiles && data.user_id) {
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("username, full_name, avatar_url, work_status")
          .eq("id", data.user_id)
          .single();
        if (profileRow) data = { ...data, profiles: profileRow };
      }

      // If courses join didn't resolve, fetch separately
      if (!data.courses && data.course_id) {
        const { data: courseRow } = await supabase
          .from("courses")
          .select("title, category, level, description, duration, lessons")
          .eq("id", data.course_id)
          .single();
        if (courseRow) data = { ...data, courses: courseRow };
      }

      // Try to fetch exam columns separately (may not exist)
      let examData = { exam_passed: false, exam_score: null };
      try {
        const { data: examRow } = await supabase
          .from("user_certificates")
          .select("exam_passed, exam_score")
          .eq("id", certId)
          .single();
        if (examRow) examData = examRow;
      } catch (_) {}

      setCert({ ...data, ...examData });
      setLoading(false);
    };
    if (certId) fetchCert();
  }, [certId]);

  const handleDownloadPDF = () => window.print();

  const shareToLinkedIn = () => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(`I earned a certificate in ${cert?.courses?.title || 'a course'} on beoneofus!`);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}`, '_blank', 'noopener,noreferrer,width=600,height=600');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-yellow-500" size={32} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-center p-6 text-center">
        <Award size={48} className="text-gray-300 dark:text-gray-700 mb-4" />
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-2">Certificate not found</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">This certificate doesn&apos;t exist or has been removed.</p>
        <Link href="/LearnPage" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all">
          Browse Courses
        </Link>
      </div>
    );
  }

  const profile = cert.profiles;
  const course = cert.courses;
  const displayName = profile?.full_name || profile?.username || "Developer";
  const issuedDate = cert.issued_at
    ? new Date(cert.issued_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const shortId = cert.id.slice(0, 16).toUpperCase();

  return (
    <>
      {/* Print / PDF styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #cert-printable, #cert-printable * { visibility: visible !important; }
          #cert-printable {
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 100vw !important; height: 100vh !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: white !important;
            padding: 40px !important;
            box-sizing: border-box !important;
          }
          .no-print { display: none !important; }
        }
        @page {
          size: A4 landscape;
          margin: 0;
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 dark:from-black dark:via-gray-950 dark:to-amber-950/10">

        {/* Topbar */}
        <nav className="no-print fixed top-0 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl z-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
            <Link href="/" className="font-black text-lg sm:text-xl tracking-tighter flex items-center gap-2 text-gray-900 dark:text-gray-100 shrink-0">
              <Terminal className="text-blue-500" size={20} />
              <span className="hidden sm:inline">beone<span className="text-blue-600">of</span>us</span>
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 text-sm font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-xl transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
              </button>
              <button
                onClick={shareToLinkedIn}
                className="flex items-center gap-1.5 text-sm font-bold text-white bg-[#0077B5] hover:bg-[#006097] px-3 sm:px-4 py-2 rounded-xl transition-all shadow-lg shadow-blue-500/20"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                <span className="hidden sm:inline">Share on LinkedIn</span>
                <span className="sm:hidden">LinkedIn</span>
              </button>
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-1.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 px-3 sm:px-4 py-2 rounded-xl transition-all shadow-lg shadow-blue-500/20"
              >
                <Download size={15} />
                <span className="hidden sm:inline">Download PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>
            </div>
          </div>
        </nav>

        <main className="pt-24 pb-20 px-4 flex flex-col items-center">

          {/* ── Certificate Card ── */}
          <div id="cert-printable" className="w-full max-w-3xl">
            <div
              className="relative w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden"
              style={{
                border: "2px solid #d4a017",
                boxShadow: "0 0 0 6px rgba(212,160,23,0.08), 0 25px 60px -12px rgba(0,0,0,0.25)",
              }}
            >
              {/* Gold top stripe */}
              <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500" />

              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.025]">
                <span className="text-[9rem] font-black text-gray-900 tracking-tighter rotate-[-20deg]">CERTIFIED</span>
              </div>

              {/* Decorative corner ornaments */}
              <div className="absolute top-6 left-6 w-10 h-10 border-t-2 border-l-2 border-yellow-400 rounded-tl-lg" />
              <div className="absolute top-6 right-6 w-10 h-10 border-t-2 border-r-2 border-yellow-400 rounded-tr-lg" />
              <div className="absolute bottom-6 left-6 w-10 h-10 border-b-2 border-l-2 border-yellow-400 rounded-bl-lg" />
              <div className="absolute bottom-6 right-6 w-10 h-10 border-b-2 border-r-2 border-yellow-400 rounded-br-lg" />

              <div className="relative px-8 sm:px-14 py-10 sm:py-14">
                {/* Header row */}
                <div className="flex items-center justify-between mb-8 sm:mb-10">
                  <div className="flex items-center gap-2">
                    <Terminal size={18} className="text-blue-600" />
                    <span className="font-black text-gray-900 tracking-tight text-sm sm:text-base">
                      beone<span className="text-blue-600">of</span>us
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-black text-amber-700 bg-amber-50 px-2.5 sm:px-3 py-1.5 rounded-full border border-amber-300">
                    <Award size={12} className="shrink-0" />
                    Certificate of Completion
                  </div>
                </div>

                {/* Body */}
                <div className="text-center mb-8 sm:mb-10">
                  <p className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-[0.25em] mb-4">
                    This is to certify that
                  </p>

                  {/* Avatar + Name */}
                  <div className="flex items-center justify-center gap-3 mb-1">
                    {profile?.avatar_url && (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-yellow-400 shadow-md shrink-0">
                        <Image src={profile.avatar_url} alt={displayName} width={48} height={48} className="object-cover w-full h-full" />
                      </div>
                    )}
                    <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight leading-tight break-words">
                      {displayName}
                    </h1>
                  </div>
                  {profile?.username && profile?.full_name && (
                    <p className="text-xs text-gray-400 font-bold mb-4">@{profile.username}</p>
                  )}

                  <p className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-5">
                    has successfully completed
                  </p>

                  {/* Course box */}
                  <div className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 rounded-2xl px-6 sm:px-10 py-5 sm:py-7 mb-6 sm:mb-8">
                    <h2 className="text-xl sm:text-3xl font-black text-gray-900 mb-3 leading-tight break-words">
                      {course?.title ?? "Course"}
                    </h2>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {course?.category && (
                        <span className="text-[10px] sm:text-xs font-bold px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full">{course.category}</span>
                      )}
                      {course?.level && (
                        <span className="text-[10px] sm:text-xs font-bold px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full">{course.level}</span>
                      )}
                      {course?.lessons && (
                        <span className="text-[10px] sm:text-xs font-bold text-gray-400">{course.lessons} Lessons</span>
                      )}
                    </div>
                  </div>

                  {/* AI Verified badge (if exam was taken) */}
                  {cert.exam_passed && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-xs font-black mb-2">
                      <ShieldCheck size={14} className="shrink-0" />
                      AI-Verified Exam · Score: {cert.exam_score ?? "—"}%
                    </div>
                  )}
                </div>

                {/* Footer row */}
                <div className="flex items-end justify-between border-t border-gray-100 pt-6 gap-4">
                  {/* Date */}
                  <div>
                    <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Date Issued</p>
                    <p className="text-xs sm:text-sm font-black text-gray-700">{issuedDate}</p>
                  </div>

                  {/* Seal */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-yellow-400 via-amber-400 to-yellow-500 flex items-center justify-center shadow-xl shadow-amber-500/40 border-4 border-yellow-200">
                      <Award size={26} className="text-white" />
                    </div>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Official Seal</p>
                  </div>

                  {/* Cert ID */}
                  <div className="text-right">
                    <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Certificate ID</p>
                    <p className="text-[10px] sm:text-xs font-mono font-bold text-gray-500">{shortId}</p>
                  </div>
                </div>

                {/* Verification line */}
                <div className="mt-5 flex items-center justify-center gap-1.5 text-[9px] sm:text-[10px] font-bold text-emerald-600">
                  <CheckCircle2 size={11} className="shrink-0" />
                  Verified by beoneofus.work · {shortId}
                </div>
              </div>

              {/* Gold bottom stripe */}
              <div className="h-1.5 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500" />
            </div>
          </div>

          {/* ── Action buttons below card ── */}
          <div className="no-print mt-6 flex flex-col sm:flex-row gap-3 w-full max-w-3xl">
            <button
              onClick={handleDownloadPDF}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-white font-black text-sm rounded-2xl transition-all shadow-lg shadow-amber-500/20"
            >
              <Download size={16} /> Download as PDF
            </button>
            <button
              onClick={copyLink}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
            >
              {copied ? <Check size={16} className="text-emerald-500" /> : <Share2 size={16} />}
              {copied ? "Link Copied!" : "Share Certificate"}
            </button>
            <Link
              href={`/u/${profile?.username}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
            >
              <ExternalLink size={16} /> View Profile
            </Link>
          </div>

          {/* Earn more */}
          <div className="no-print mt-4">
            <Link href="/LearnPage" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 justify-center">
              <Award size={14} /> Earn more certificates
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
