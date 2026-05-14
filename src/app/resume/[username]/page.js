"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "../../supabaseClient";
import { Printer, ArrowLeft, Loader2, Terminal, MapPin, Globe, Mail, Award, Briefcase, Code2 } from "lucide-react";
import { useLanguage } from "../../../lib/i18n";

export default function ResumePage() {
  const { t } = useLanguage();
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [certs, setCerts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: p, error } = await supabase.from("profiles").select("*").eq("username", username).single();
      if (error || !p) { setNotFound(true); setLoading(false); return; }
      setProfile(p);

      const [certsRes, projectsRes, postsRes] = await Promise.all([
        supabase.from("user_certificates")
          .select("id, issued_at, courses(title, category, level)")
          .eq("user_id", p.id)
          .order("issued_at", { ascending: false })
          .limit(8),
        supabase.from("projects")
          .select("id, title, description, tags, status, github_url, live_url")
          .eq("user_id", p.id)
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase.from("posts")
          .select("id, title, content, code_snippet, created_at")
          .eq("user_id", p.id)
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

      setCerts(certsRes.data || []);
      setProjects(projectsRes.data || []);
      setPosts(postsRes.data || []);
      setLoading(false);
    };
    if (username) load();
  }, [username]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="animate-spin text-blue-500" size={28} />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-black mb-2">{t('resume.not_found')}</h1>
      <Link href="/" className="text-blue-600 hover:underline">{t('resume.go_home')}</Link>
    </div>
  );

  const displayName = profile.full_name || `@${profile.username}`;
  const githubHandle = profile.github?.replace(/^@/, "").replace(/.*github\.com\//, "");

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: A4; margin: 15mm; }
        }
      `}</style>

      {/* Toolbar — hidden on print */}
      <div className="no-print fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between max-w-4xl mx-auto w-full">
        <Link href={`/u/${username}`} className="flex items-center gap-1.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} /> {t('resume.back_to_profile')}
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 hidden sm:block">{t('resume.print_hint')}</span>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-4 py-2 rounded-xl transition-all shadow-md shadow-blue-500/20"
          >
            <Printer size={15} /> {t('resume.print_button')}
          </button>
        </div>
      </div>

      {/* Resume Content */}
      <main className="pt-14 print:pt-0 min-h-screen bg-white text-gray-900">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-10 print:py-0">

          {/* Header */}
          <div className="flex items-start gap-5 mb-8 pb-6 border-b-2 border-gray-900">
            {profile.avatar_url && (
              <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-gray-200 no-print">
                <Image src={profile.avatar_url} alt={displayName} width={80} height={80} className="object-cover w-full h-full" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-black tracking-tight text-gray-900">{displayName}</h1>
                {profile.work_status && profile.work_status !== "None" && (
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border bg-green-50 text-green-700 border-green-200">
                    {profile.work_status}
                  </span>
                )}
              </div>
              {profile.full_name && <p className="text-sm text-gray-500 font-medium mb-1">@{profile.username}</p>}
              {profile.status && <p className="text-gray-600 text-sm leading-relaxed max-w-xl mt-1">{profile.status}</p>}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
                {profile.location && <span className="flex items-center gap-1"><MapPin size={11} /> {profile.location}</span>}
                {githubHandle && <span className="flex items-center gap-1"><Code2 size={11} /> github.com/{githubHandle}</span>}
                {profile.website && (
                  <span className="flex items-center gap-1"><Globe size={11} /> {profile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                )}
                <span className="flex items-center gap-1">
                  <Terminal size={11} /> beoneofus.work/u/{profile.username}
                </span>
              </div>
            </div>
          </div>

          {/* Certificates */}
          {certs.length > 0 && (
            <section className="mb-7">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-3 flex items-center gap-2">
                <Award size={12} /> {t('resume.certifications')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {certs.map(cert => (
                  <div key={cert.id} className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl bg-amber-50/30">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Award size={13} className="text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 leading-tight">{cert.courses?.title || t('resume.course_certificate')}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                        {cert.courses?.category} · {cert.courses?.level} · {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <section className="mb-7">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-3 flex items-center gap-2">
                <Code2 size={12} /> {t('resume.projects')}
              </h2>
              <div className="space-y-3">
                {projects.map(p => (
                  <div key={p.id} className="border-l-2 border-blue-500 pl-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900">{p.title}</p>
                      <div className="flex items-center gap-2">
                        {p.github_url && <span className="text-[10px] text-gray-400 font-mono">{p.github_url.replace(/^https?:\/\//, "")}</span>}
                        {p.status && <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{p.status}</span>}
                      </div>
                    </div>
                    {p.description && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{p.description}</p>}
                    {p.tags && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {p.tags.split(",").slice(0, 5).map(t => (
                          <span key={t} className="text-[9px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{t.trim()}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recent Writing */}
          {posts.length > 0 && (
            <section className="mb-7">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-3 flex items-center gap-2">
                <Briefcase size={12} /> {t('resume.technical_writing')}
              </h2>
              <div className="space-y-2">
                {posts.map(post => (
                  <div key={post.id} className="flex items-start gap-2">
                    <span className="text-gray-300 mt-1 text-sm">—</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{post.title || post.content?.slice(0, 60) + "…"}</p>
                      <p className="text-[10px] text-gray-400">{new Date(post.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Footer */}
          <div className="pt-6 border-t border-gray-100 text-center">
            <p className="text-[10px] text-gray-400">
              {t('resume.generated_by')} <span className="font-bold text-gray-500">beoneofus.work</span> · {t('resume.verify_at')} beoneofus.work/u/{profile.username}
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
