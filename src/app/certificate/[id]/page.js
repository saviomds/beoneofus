"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Award, Terminal, Printer, Share2, CheckCircle2,
  Loader2, ExternalLink, Copy, Check
} from "lucide-react";
import { supabase } from "../../supabaseClient";

export default function CertificatePage() {
  const params = useParams();
  const certId = params.id;
  const printRef = useRef(null);

  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchCert = async () => {
      const { data, error } = await supabase
        .from("user_certificates")
        .select(`
          id,
          issued_at,
          user_id,
          course_id,
          courses(title, category, level, description, duration, lessons),
          profiles!user_certificates_user_id_fkey(username, avatar_url, work_status)
        `)
        .eq("id", certId)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setCert(data);
      }
      setLoading(false);
    };

    if (certId) fetchCert();
  }, [certId]);

  const handlePrint = () => window.print();

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
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-2">
          Certificate not found
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          This certificate doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/LearnPage"
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all"
        >
          Browse Courses
        </Link>
      </div>
    );
  }

  const profile = cert.profiles;
  const course = cert.courses;
  const issuedDate = new Date(cert.issued_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #certificate-card, #certificate-card * { visibility: visible; }
          #certificate-card {
            position: fixed; top: 0; left: 0;
            width: 100vw; height: 100vh;
            display: flex; align-items: center; justify-content: center;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-black dark:to-blue-950/20">
        {/* Topbar */}
        <nav className="no-print fixed top-0 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl z-50">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link
              href="/"
              className="font-black text-xl tracking-tighter flex items-center gap-2 text-gray-900 dark:text-gray-100"
            >
              <Terminal className="text-blue-500" size={22} />
              beone<span className="text-blue-600">of</span>us
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={copyLink}
                className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-xl transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl transition-all shadow-lg shadow-blue-500/20"
              >
                <Printer size={15} />
                Print / Save PDF
              </button>
            </div>
          </div>
        </nav>

        <main className="pt-24 pb-20 px-4 flex flex-col items-center">
          {/* Certificate Card */}
          <div
            id="certificate-card"
            ref={printRef}
            className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
          >
            {/* Decorative background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-100/50 via-transparent to-transparent dark:from-yellow-900/10 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400" />

            <div className="relative p-8 sm:p-12">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <Terminal size={20} className="text-blue-600" />
                  <span className="font-black text-gray-900 dark:text-gray-100 tracking-tight">
                    beone<span className="text-blue-600">of</span>us
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800/50">
                  <Award size={14} />
                  Certificate of Completion
                </div>
              </div>

              {/* Main body */}
              <div className="text-center mb-8">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">
                  This certifies that
                </p>
                <div className="flex items-center justify-center gap-3 mb-2">
                  {profile?.avatar_url && (
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-yellow-300 shadow-md">
                      <Image
                        src={profile.avatar_url}
                        alt={profile.username}
                        width={48}
                        height={48}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}
                  <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
                    @{profile?.username ?? "Developer"}
                  </h1>
                </div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] mb-5">
                  has successfully completed
                </p>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-6 mb-6">
                  <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-100 mb-2">
                    {course?.title ?? "Course"}
                  </h2>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    {course?.category && (
                      <span className="text-xs font-bold px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">
                        {course.category}
                      </span>
                    )}
                    {course?.level && (
                      <span className="text-xs font-bold px-2.5 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full">
                        {course.level}
                      </span>
                    )}
                    {course?.lessons && (
                      <span className="text-xs font-bold text-gray-500">
                        {course.lessons} Lessons
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Date Issued
                  </p>
                  <p className="text-sm font-black text-gray-700 dark:text-gray-300">
                    {issuedDate}
                  </p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <Award size={28} className="text-white" />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Certificate ID
                  </p>
                  <p className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400">
                    {cert.id.slice(0, 12).toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Verification badge */}
              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={14} />
                Verified by beoneofus · {window?.location?.href}
              </div>
            </div>
          </div>

          {/* Actions below card */}
          <div className="no-print mt-6 flex flex-col sm:flex-row gap-3 w-full max-w-2xl">
            <Link
              href={`/u/${profile?.username}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
            >
              <ExternalLink size={16} />
              View @{profile?.username}&apos;s Profile
            </Link>
            <Link
              href="/LearnPage"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-blue-500/20"
            >
              <Award size={16} />
              Earn More Certificates
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
