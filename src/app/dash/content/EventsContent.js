"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calendar, MapPin, Globe, Lock, Crown, CheckCircle2,
  Clock, Users, Loader2, Plus, X, ExternalLink, Sparkles,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import Link from "next/link";

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function Countdown({ targetDate }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate) - Date.now();
      if (diff <= 0) { setLabel(""); return; }
      const totalMin = Math.floor(diff / 60000);
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 48) setLabel(`${Math.floor(h / 24)}d`);
      else if (h > 0) setLabel(`${h}h ${m}m`);
      else setLabel(`${m}m ${s}s`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return label ? <span className="font-mono">{label}</span> : null;
}

const EMPTY = {
  title: "", description: "", event_date: "", location: "",
  is_online: false, event_url: "", max_attendees: "",
  premium_hours_early: "24", public_opens_at: "",
};

export default function EventsContent() {
  const [profile, setProfile]         = useState(null);
  const [user, setUser]               = useState(null);
  const [events, setEvents]           = useState([]);
  const [registrations, setRegistrations] = useState(new Set());
  const [loading, setLoading]         = useState(true);
  const [registeringId, setRegisteringId] = useState(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [form, setForm]               = useState(EMPTY);
  const [creating, setCreating]       = useState(false);

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    setUser(session.user);

    const [profileRes, eventsRes, regsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", session.user.id).single(),
      supabase.from("events")
        .select("*")
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true }),
      supabase.from("event_registrations").select("event_id").eq("user_id", session.user.id),
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    if (eventsRes.data)  setEvents(eventsRes.data);
    if (regsRes.data)    setRegistrations(new Set(regsRes.data.map(r => r.event_id)));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* Realtime updates */
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("events-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_registrations",
        filter: `user_id=eq.${user.id}` }, fetchData)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user, fetchData]);

  const handleRegister = async (eventId) => {
    if (registeringId) return;
    setRegisteringId(eventId);
    try {
      if (registrations.has(eventId)) {
        await supabase.from("event_registrations").delete()
          .eq("event_id", eventId).eq("user_id", user.id);
        setRegistrations(prev => { const s = new Set(prev); s.delete(eventId); return s; });
      } else {
        await supabase.from("event_registrations").insert({ event_id: eventId, user_id: user.id });
        setRegistrations(prev => new Set([...prev, eventId]));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRegisteringId(null);
    }
  };

  const handleCreate = async () => {
    if (creating || !form.title.trim() || !form.event_date) return;
    setCreating(true);
    try {
      const publicOpens = form.public_opens_at || form.event_date;
      const premiumOpens = form.premium_hours_early
        ? new Date(new Date(publicOpens).getTime() - parseInt(form.premium_hours_early) * 3600000).toISOString()
        : null;

      await supabase.from("events").insert({
        title:          form.title.trim(),
        description:    form.description.trim() || null,
        event_date:     new Date(form.event_date).toISOString(),
        location:       form.location.trim() || null,
        is_online:      form.is_online,
        event_url:      form.event_url.trim() || null,
        max_attendees:  form.max_attendees ? parseInt(form.max_attendees) : null,
        premium_opens_at: premiumOpens,
        public_opens_at:  new Date(publicOpens).toISOString(),
        created_by:     user.id,
      });
      setForm(EMPTY);
      setShowCreate(false);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={22} className="animate-spin text-blue-500" />
    </div>
  );

  const isPremium = profile?.is_premium || profile?.is_admin;
  const isAdmin   = profile?.is_admin;
  const now       = Date.now();

  const inputCls = "w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30";

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar size={22} className="text-blue-500" />
            Events
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isPremium
              ? "You have early access to upcoming events."
              : "Premium members get early registration access."}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(v => !v)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all active:scale-95 shrink-0"
          >
            {showCreate ? <X size={14} /> : <Plus size={14} />}
            {showCreate ? "Cancel" : "Create Event"}
          </button>
        )}
      </div>

      {/* Premium banner for free users */}
      {!isPremium && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl">
          <Crown size={18} className="text-amber-500 shrink-0" fill="currentColor" strokeWidth={1.5} stroke="white" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Early Access with Premium</p>
            <p className="text-xs text-amber-700 dark:text-amber-400">Premium members can register before free members. Upgrade to never miss a spot.</p>
          </div>
          <Link href="/dash/premium" className="shrink-0 text-xs font-black text-amber-600 hover:text-amber-500 underline">
            Upgrade
          </Link>
        </div>
      )}

      {/* Admin: create event form */}
      {showCreate && isAdmin && (
        <div className="bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-5 shadow-sm">
          <h3 className="font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Sparkles size={15} className="text-blue-500" />
            New Event
          </h3>
          <div className="space-y-3">
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Event title *" className={inputCls} />
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description" rows={2} className={`${inputCls} resize-none`} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Event Date & Time *</label>
                <input type="datetime-local" value={form.event_date}
                  onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Public Registration Opens</label>
                <input type="datetime-local" value={form.public_opens_at}
                  onChange={e => setForm(f => ({ ...f, public_opens_at: e.target.value }))} className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Premium early access (hours before public)</label>
                <input type="number" min="0" value={form.premium_hours_early} placeholder="24"
                  onChange={e => setForm(f => ({ ...f, premium_hours_early: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Max Attendees</label>
                <input type="number" min="1" value={form.max_attendees} placeholder="Unlimited"
                  onChange={e => setForm(f => ({ ...f, max_attendees: e.target.value }))} className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="Location (city / venue)" className={inputCls} />
              <input value={form.event_url} onChange={e => setForm(f => ({ ...f, event_url: e.target.value }))}
                placeholder="Event link (optional)" className={inputCls} />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_online}
                onChange={e => setForm(f => ({ ...f, is_online: e.target.checked }))}
                className="rounded accent-blue-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Online event</span>
            </label>

            <button onClick={handleCreate} disabled={creating || !form.title || !form.event_date}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98] text-sm">
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {creating ? "Creating…" : "Create Event"}
            </button>
          </div>
        </div>
      )}

      {/* Events list */}
      {events.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <Calendar size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No upcoming events</p>
          {isAdmin && <p className="text-xs mt-1 opacity-60">Create your first event above</p>}
        </div>
      )}

      <div className="space-y-4">
        {events.map(event => {
          const isRegistered    = registrations.has(event.id);
          const premiumOpenTs   = event.premium_opens_at ? new Date(event.premium_opens_at).getTime() : null;
          const publicOpenTs    = new Date(event.public_opens_at).getTime();
          const eventTs         = new Date(event.event_date).getTime();
          const isPast          = now >= eventTs;

          /* Can user register right now? */
          const canRegister = isPremium
            ? (!premiumOpenTs || now >= premiumOpenTs)
            : now >= publicOpenTs;

          /* Is this currently in the premium-only window? */
          const inPremiumWindow = premiumOpenTs && now >= premiumOpenTs && now < publicOpenTs;

          /* Time until registration opens for current user */
          const waitUntil = isPremium ? premiumOpenTs : publicOpenTs;
          const waitOpen  = waitUntil && now < waitUntil;

          return (
            <div key={event.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5">
                {/* Title row */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-black text-gray-900 dark:text-white">{event.title}</h3>
                      {inPremiumWindow && (
                        <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/30">
                          <Crown size={8} fill="currentColor" strokeWidth={1.5} stroke="white" />
                          Early Access
                        </span>
                      )}
                      {event.is_online && (
                        <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <Globe size={8} /> Online
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{event.description}</p>
                    )}
                  </div>
                  {isRegistered && !isPast && (
                    <span className="shrink-0 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                      <CheckCircle2 size={10} /> Registered
                    </span>
                  )}
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar size={11} /> {formatDate(event.event_date)}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={11} /> {event.location}
                    </span>
                  )}
                  {event.max_attendees && (
                    <span className="flex items-center gap-1">
                      <Users size={11} /> Max {event.max_attendees}
                    </span>
                  )}
                  {event.event_url && (
                    <a href={event.event_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-500 hover:text-blue-400 transition-colors">
                      <ExternalLink size={11} /> Event Link
                    </a>
                  )}
                </div>

                {/* Action */}
                {isPast ? (
                  <span className="text-xs font-medium text-gray-400">Event has ended</span>
                ) : canRegister ? (
                  <button
                    onClick={() => handleRegister(event.id)}
                    disabled={registeringId === event.id}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all active:scale-95 ${
                      isRegistered
                        ? "bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20"
                        : "bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/20"
                    }`}
                  >
                    {registeringId === event.id
                      ? <Loader2 size={13} className="animate-spin" />
                      : isRegistered ? <X size={13} /> : <CheckCircle2 size={13} />}
                    {isRegistered ? "Cancel Registration" : "Register Now"}
                  </button>
                ) : waitOpen ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    {!isPremium && inPremiumWindow === false && (
                      <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                        <Crown size={11} className="text-amber-500" fill="currentColor" strokeWidth={1.5} stroke="white" />
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                          Premium opens in <Countdown targetDate={event.premium_opens_at || event.public_opens_at} />
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                      <Clock size={11} className="text-gray-400" />
                      <span className="text-xs font-medium text-gray-500">
                        {isPremium ? "Early access opens in" : "Public opens in"}{" "}
                        <Countdown targetDate={waitUntil} />
                      </span>
                    </div>
                    {!isPremium && (
                      <Link href="/dash/premium" className="text-xs font-black text-amber-600 hover:text-amber-500 underline">
                        Get early access
                      </Link>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
