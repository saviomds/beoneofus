"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  CheckCircle2, ArrowRight, User, Code2, Briefcase, Globe,
  Loader2, Sparkles, Users, MessageSquare, BookOpen, Award,
  MapPin, Github, Link, ChevronRight,
} from "lucide-react";
import { supabase } from "../supabaseClient";

const WORK_STATUSES = [
  { value: "Open to Work", label: "Open to Work", desc: "Looking for job opportunities", color: "bg-emerald-500" },
  { value: "Hiring", label: "Hiring", desc: "Recruiting talent for my team", color: "bg-blue-500" },
  { value: "Freelancing", label: "Freelancing", desc: "Available for freelance projects", color: "bg-purple-500" },
  { value: "Building", label: "Building", desc: "Working on my own products", color: "bg-orange-500" },
  { value: "Student", label: "Student", desc: "Currently studying and learning", color: "bg-cyan-500" },
  { value: "Employed", label: "Just Exploring", desc: "Not actively looking right now", color: "bg-gray-500" },
];

const SKILL_SUGGESTIONS = [
  "JavaScript", "Python", "React", "Node.js", "TypeScript", "SQL",
  "AWS", "Docker", "Figma", "Product Management", "Data Science",
  "Machine Learning", "iOS", "Android", "Vue.js", "Django", "Go", "Rust",
];

const STEPS = [
  { id: "profile",  label: "Your Profile",   icon: User },
  { id: "status",   label: "Work Status",    icon: Briefcase },
  { id: "skills",   label: "Your Skills",    icon: Code2 },
  { id: "complete", label: "All Set!",        icon: CheckCircle2 },
];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, i) => {
        const idx = STEPS.findIndex((s) => s.id === current);
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={step.id} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
              done ? "bg-emerald-500 text-white" :
              active ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" :
              "bg-gray-200 dark:bg-gray-700 text-gray-400"
            }`}>
              {done ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-0.5 rounded-full transition-all duration-300 ${done ? "bg-emerald-500" : "bg-gray-200 dark:bg-gray-700"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState("profile");
  const [session, setSession] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    full_name: "",
    location: "",
    github: "",
    website: "",
  });
  const [workStatus, setWorkStatus] = useState("");
  const [skills, setSkills] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/auth"); return; }
      setSession(session);
      supabase.from("profiles").select("username, full_name, location, github, website, work_status, skills")
        .eq("id", session.user.id).single()
        .then(({ data }) => {
          if (data) {
            setFormData({ full_name: data.full_name || "", location: data.location || "", github: data.github || "", website: data.website || "" });
            if (data.work_status) setWorkStatus(data.work_status);
            if (data.skills?.length) setSkills(data.skills);
          }
        });
    });
  }, [router]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const saveAndNext = async () => {
    if (!session) return;
    setSaving(true);
    try {
      const updates = {};
      if (step === "profile") {
        if (!formData.full_name.trim()) { showToast("Please enter your name", "error"); setSaving(false); return; }
        Object.assign(updates, {
          full_name: formData.full_name.trim(),
          location: formData.location.trim(),
          github: formData.github.trim().replace(/^@/, ""),
          website: formData.website.trim(),
        });
      } else if (step === "status") {
        updates.work_status = workStatus;
      } else if (step === "skills") {
        updates.skills = skills;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from("profiles").update(updates).eq("id", session.user.id);
        if (error) throw error;
      }

      const idx = STEPS.findIndex((s) => s.id === step);
      if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].id);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleSkill = (skill) => {
    setSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]);
  };

  const handleComplete = () => router.replace("/dash/home");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10 select-none">
        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
          <span className="text-white font-black text-base">b</span>
        </div>
        <span className="font-black text-xl tracking-tighter text-gray-900 dark:text-gray-100">
          beone<span className="text-blue-600">of</span>us
        </span>
      </div>

      <StepIndicator current={step} />

      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl shadow-gray-200/50 dark:shadow-black/30 overflow-hidden">

          {/* Profile Step */}
          {step === "profile" && (
            <div className="p-7 space-y-5">
              <div className="text-center mb-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
                  <User size={22} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h1 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Tell us about yourself</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Help others know who you are</p>
              </div>

              <div>
                <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Full Name *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Your full name"
                  autoFocus
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Location</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="City, Country"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">GitHub</label>
                  <input
                    type="text"
                    value={formData.github}
                    onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                    placeholder="username"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Website</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Work Status Step */}
          {step === "status" && (
            <div className="p-7 space-y-4">
              <div className="text-center mb-2">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-3">
                  <Briefcase size={22} className="text-purple-600 dark:text-purple-400" />
                </div>
                <h1 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">What describes you best?</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This helps others know how to approach you</p>
              </div>

              <div className="space-y-2">
                {WORK_STATUSES.map(({ value, label, desc, color }) => (
                  <button
                    key={value}
                    onClick={() => setWorkStatus(value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      workStatus === value
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${color} shrink-0`} />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                    </div>
                    {workStatus === value && <CheckCircle2 size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Skills Step */}
          {step === "skills" && (
            <div className="p-7 space-y-4">
              <div className="text-center mb-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                  <Code2 size={22} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <h1 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Add your skills</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select the skills you want to be known for</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {SKILL_SUGGESTIONS.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                      skills.includes(skill)
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/30"
                        : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-700"
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>

              {skills.length > 0 && (
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                  {skills.length} skill{skills.length !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          )}

          {/* Complete Step */}
          {step === "complete" && (
            <div className="p-7 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-2 shadow-2xl shadow-blue-500/30 animate-in zoom-in-95 duration-500">
                <CheckCircle2 size={36} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight mb-1">You&apos;re all set!</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                  Your profile is ready. Start exploring the network, connecting with people, and building your presence.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { icon: Users, label: "Connect with people" },
                  { icon: MessageSquare, label: "Start chatting" },
                  { icon: Sparkles, label: "Use AI tools" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <Icon size={20} className="text-blue-600 dark:text-blue-400" />
                    <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 text-center">{label}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleComplete}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black py-3.5 rounded-2xl text-sm transition-all shadow-lg shadow-blue-500/20 mt-4"
              >
                Enter the Network <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* CTA button for non-complete steps */}
          {step !== "complete" && (
            <div className="px-7 pb-7">
              <button
                onClick={saveAndNext}
                disabled={saving || (step === "profile" && !formData.full_name.trim())}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 text-white font-black py-3.5 rounded-2xl text-sm transition-all shadow-lg shadow-blue-500/20"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                {saving ? "Saving…" : step === "skills" ? "Finish Setup" : "Continue"}
              </button>
              <button
                onClick={() => {
                  const idx = STEPS.findIndex((s) => s.id === step);
                  if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].id);
                }}
                className="w-full mt-2 text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-2 transition-colors"
              >
                Skip for now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] px-4 py-3 rounded-2xl text-sm font-semibold shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${
          toast.type === "error" ? "bg-red-600 text-white" : "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
