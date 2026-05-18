"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Briefcase, Activity, ArrowRight, Target, Loader2, CheckCircle2,
  Check, Clock, Calendar, Zap, Terminal, ShieldCheck, X, Plus, Crown,
  Search, BarChart3, ClipboardList, RefreshCw, Shield, UserCheck, UserX,
  ChevronDown, AlertTriangle, Filter, Image as ImageIcon,
  ScrollText, FileText, Send, DollarSign, PenLine, XCircle, Eye,
  Printer, History, Trash2, Ban, ExternalLink, AlertOctagon,
  ChevronRight, Mail, CalendarDays, Star, BookOpen,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '../supabaseClient';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    gray:    'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
    blue:    'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    amber:   'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    red:     'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20',
    violet:  'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/20',
    amber2:  'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
}

function priorityColor(p: string) {
  if (!p) return 'gray';
  if (p.toLowerCase() === 'high') return 'red';
  if (p.toLowerCase() === 'medium') return 'amber';
  return 'blue';
}

function statusColor(s: string) {
  if (!s) return 'gray';
  if (s === 'accepted' || s === 'completed') return 'emerald';
  if (s === 'declined' || s === 'rejected') return 'red';
  if (s === 'pending') return 'amber';
  if (s === 'in_progress') return 'blue';
  return 'gray';
}

function getRelativeTime(dateStr: string) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

// ─── Component ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',     label: 'Overview',     icon: BarChart3 },
  { id: 'applications', label: 'Applications', icon: Crown },
  { id: 'users',        label: 'Users',        icon: Users },
  { id: 'tasks',        label: 'Tasks',        icon: ClipboardList },
  { id: 'contracts',    label: 'Contracts',    icon: ScrollText },
];

export default function FounderDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [currentDate, setCurrentDate] = useState('');

  // Overview stats
  const [stats, setStats] = useState({ team: 0, pendingApps: 0, totalTasks: 0, completedTasks: 0 });

  // Applications tab
  const [applications, setApplications] = useState<any[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [appActionLoading, setAppActionLoading] = useState(false);

  // Users tab
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Tasks tab
  const [tasks, setTasks] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskFilter, setTaskFilter] = useState('all');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskProcessing, setTaskProcessing] = useState(false);
  const [taskForm, setTaskForm] = useState({ assignee_id: '', title: '', description: '', priority: 'Medium', due_date: '' });

  // Contracts tab
  const [contractsList, setContractsList] = useState<any[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [editingContract, setEditingContract] = useState<any>(null);
  const [contractProcessing, setContractProcessing] = useState(false);
  const [contractFilter, setContractFilter] = useState('all');
  const [previewingContract, setPreviewingContract] = useState<any>(null);
  const [contractTemplates, setContractTemplates] = useState<any[]>([]);
  const [showTemplateList, setShowTemplateList] = useState(false);
  const [showRevisionsFor, setShowRevisionsFor] = useState<string | null>(null);
  const [contractForm, setContractForm] = useState({
    user_id: '', title: '', contract_type: 'Project', work_description: '',
    deliverables: '', payment_amount: '', payment_currency: 'USD',
    payment_terms: '', payment_schedule: '', start_date: '', end_date: '',
    notes: '', status: 'sent',
  });

  // Users tab extras
  const [userFilter, setUserFilter] = useState('all');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userActionLoading, setUserActionLoading] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const showToast = useCallback((msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500);
  }, []);

  // ── Auth & access check ────────────────────────────────────────────────────
  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));

    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/auth'); return; }

      const uid = session.user.id;
      setCurrentUserId(uid);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, avatar_url, is_verified, is_admin, role')
        .eq('id', uid)
        .single();

      if (profileData) {
        setProfile(profileData);
        if (profileData.is_admin) setIsAdmin(true);
      }

      // Check if admin or accepted co-founder
      const isAdminUser = !!profileData?.is_admin;
      if (!isAdminUser) {
        const { data: appData } = await supabase
          .from('founder_applications')
          .select('status')
          .eq('user_id', uid)
          .eq('status', 'accepted')
          .limit(1)
          .single();
        if (!appData) { router.push('/dash/feed'); return; }
      }

      setHasAccess(true);
      setLoading(false);
    };
    checkAccess();
  }, [router]);

  // ── Stats (Overview) ──────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    const [teamRes, pendingRes, tasksRes] = await Promise.all([
      supabase.from('founder_applications').select('id', { count: 'exact', head: true }).eq('status', 'accepted'),
      supabase.from('founder_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('tasks').select('id, status'),
    ]);
    const allTasks = tasksRes.data || [];
    setStats({
      team: teamRes.count || 0,
      pendingApps: pendingRes.count || 0,
      totalTasks: allTasks.length,
      completedTasks: allTasks.filter(t => t.status === 'completed').length,
    });
  }, []);

  useEffect(() => {
    if (hasAccess && activeTab === 'overview') fetchStats();
  }, [hasAccess, activeTab, fetchStats]);

  // ── Applications ──────────────────────────────────────────────────────────
  const fetchApplications = useCallback(async () => {
    setAppsLoading(true);
    const { data } = await supabase
      .from('founder_applications')
      .select('*, profiles:user_id(id, username, avatar_url, status, is_verified, role)')
      .order('created_at', { ascending: false });
    setApplications(data || []);
    setAppsLoading(false);
  }, []);

  useEffect(() => {
    if (hasAccess && activeTab === 'applications') fetchApplications();
  }, [hasAccess, activeTab, fetchApplications]);

  const handleApplicationAction = async (appId: string, status: 'accepted' | 'declined', applicantId: string, appTitle: string) => {
    setAppActionLoading(true);
    try {
      const { error } = await supabase.from('founder_applications').update({ status }).eq('id', appId);
      if (error) throw error;

      // Notify applicant
      await supabase.from('notifications').insert({
        receiver_id: applicantId,
        actor_id: currentUserId,
        type: 'message',
        content: `Your co-founder application was ${status}. ${status === 'accepted' ? 'Welcome to the founding team!' : 'Thank you for your interest.'}`,
      });

      // If accepted, update profile role
      if (status === 'accepted') {
        await supabase.from('profiles').update({ role: 'founder' }).eq('id', applicantId);
      }

      // Send email notification
      try {
        await fetch('/api/notify-applicant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applicationId: appId, applicantId, status, role: appTitle }),
        });
      } catch { /* non-blocking */ }

      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
      if (selectedApp?.id === appId) setSelectedApp((prev: any) => ({ ...prev, status }));
      showToast(`Application ${status}.`);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setAppActionLoading(false);
    }
  };

  // ── Users ─────────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, username, email, avatar_url, status, is_verified, is_admin, is_premium, role, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    setUsers(data || []);
    setAllUsers(data || []);
    setUsersLoading(false);
  }, []);

  useEffect(() => {
    if (hasAccess && activeTab === 'users') fetchUsers();
  }, [hasAccess, activeTab, fetchUsers]);

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:profiles!tasks_assignee_id_fkey(id, username, avatar_url),
        assigner:profiles!tasks_assigner_id_fkey(id, username, avatar_url)
      `)
      .order('created_at', { ascending: false });
    setTasks(data || []);
    setTasksLoading(false);
  }, []);

  useEffect(() => {
    if (hasAccess && activeTab === 'tasks') {
      fetchTasks();
      if (allUsers.length === 0) fetchUsers();
    }
  }, [hasAccess, activeTab, fetchTasks, fetchUsers, allUsers.length]);

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.assignee_id || !taskForm.title) return;
    setTaskProcessing(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          assignee_id: taskForm.assignee_id,
          assigner_id: currentUserId,
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          status: 'pending',
          due_date: taskForm.due_date || null,
        })
        .select(`*, assignee:profiles!tasks_assignee_id_fkey(id, username, avatar_url), assigner:profiles!tasks_assigner_id_fkey(id, username, avatar_url)`)
        .single();
      if (error) throw error;

      await supabase.from('notifications').insert({
        receiver_id: taskForm.assignee_id,
        actor_id: currentUserId,
        type: 'message',
        content: `assigned you a task: "${taskForm.title}"`,
      });

      setTasks(prev => [data, ...prev]);
      setShowTaskModal(false);
      setTaskForm({ assignee_id: '', title: '', description: '', priority: 'Medium', due_date: '' });
      showToast('Task assigned!');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setTaskProcessing(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    if (!error) setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  // ── Contracts ─────────────────────────────────────────────────────────────
  const fetchContracts = useCallback(async () => {
    setContractsLoading(true);
    const { data } = await supabase
      .from('contracts')
      .select('*, user:profiles!contracts_user_id_fkey(id, username, avatar_url)')
      .order('created_at', { ascending: false });
    setContractsList(data || []);
    setContractsLoading(false);
  }, []);

  useEffect(() => {
    if (hasAccess && activeTab === 'contracts') {
      fetchContracts();
      if (allUsers.length === 0) fetchUsers();
    }
  }, [hasAccess, activeTab, fetchContracts, fetchUsers, allUsers.length]);

  const openEditContract = (c: any) => {
    setEditingContract(c);
    setContractForm({
      user_id: c.user_id || '',
      title: c.title || '',
      contract_type: c.contract_type || 'Project',
      work_description: c.work_description || '',
      deliverables: c.deliverables || '',
      payment_amount: c.payment_amount ? String(c.payment_amount) : '',
      payment_currency: c.payment_currency || 'USD',
      payment_terms: c.payment_terms || '',
      payment_schedule: c.payment_schedule || '',
      start_date: c.start_date || '',
      end_date: c.end_date || '',
      notes: c.notes || '',
      status: c.status || 'sent',
    });
    setShowContractModal(true);
  };

  const closeContractModal = () => {
    setShowContractModal(false);
    setEditingContract(null);
    setShowTemplateList(false);
    setContractForm({
      user_id: '', title: '', contract_type: 'Project', work_description: '',
      deliverables: '', payment_amount: '', payment_currency: 'USD',
      payment_terms: '', payment_schedule: '', start_date: '', end_date: '',
      notes: '', status: 'sent',
    });
  };

  // ── Contract template helpers (localStorage) ──────────────────────────────
  const TEMPLATES_KEY = 'bou_contract_templates';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try { setContractTemplates(JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]')); } catch {}
    }
  }, []);

  const saveAsTemplate = () => {
    const tpl = {
      id: Date.now(), name: contractForm.title || 'Untitled Template',
      contract_type: contractForm.contract_type,
      work_description: contractForm.work_description,
      deliverables: contractForm.deliverables,
      payment_currency: contractForm.payment_currency,
      payment_terms: contractForm.payment_terms,
      payment_schedule: contractForm.payment_schedule,
      notes: contractForm.notes,
      savedAt: new Date().toISOString(),
    };
    const updated = [tpl, ...contractTemplates].slice(0, 10);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
    setContractTemplates(updated);
    showToast('Saved as template!');
  };

  const applyTemplate = (t: any) => {
    setContractForm(prev => ({
      ...prev,
      contract_type: t.contract_type,
      work_description: t.work_description || '',
      deliverables: t.deliverables || '',
      payment_currency: t.payment_currency || 'USD',
      payment_terms: t.payment_terms || '',
      payment_schedule: t.payment_schedule || '',
      notes: t.notes || '',
    }));
    setShowTemplateList(false);
    showToast('Template applied!');
  };

  const deleteTemplate = (id: number) => {
    const updated = contractTemplates.filter(t => t.id !== id);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
    setContractTemplates(updated);
  };

  // ── Contract revision helpers (localStorage) ──────────────────────────────
  const saveRevision = (contractId: string, snapshot: any) => {
    try {
      const key = `bou_rev_${contractId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = [{ ts: new Date().toISOString(), data: snapshot }, ...existing].slice(0, 8);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {}
  };

  const getRevisions = (contractId: string) => {
    try { return JSON.parse(localStorage.getItem(`bou_rev_${contractId}`) || '[]'); } catch { return []; }
  };

  // ── Print contract ────────────────────────────────────────────────────────
  const printContract = (c: any) => {
    const win = window.open('', '_blank', 'width=820,height=700');
    if (!win) return;
    const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
    const html = `<!DOCTYPE html><html><head><title>${c.title}</title><style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Georgia,serif;max-width:720px;margin:48px auto;color:#111;padding:0 24px}
      .header{text-align:center;margin-bottom:36px;padding-bottom:24px;border-bottom:3px solid #111}
      .brand{font-family:Arial,sans-serif;font-size:13px;font-weight:900;letter-spacing:4px;color:#2563eb;text-transform:uppercase}
      .doc-type{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#888;margin-top:4px}
      h1{font-size:26px;margin:20px 0 8px;font-family:Arial,sans-serif;font-weight:900}
      .meta{display:flex;flex-wrap:wrap;gap:24px;font-size:12px;color:#555;margin-bottom:24px}
      .meta span strong{color:#111}
      .section{margin:24px 0}
      .section-label{font-size:9px;font-weight:900;letter-spacing:3px;text-transform:uppercase;color:#888;margin-bottom:10px;padding-bottom:4px;border-bottom:1px solid #eee}
      .section p{font-size:14px;line-height:1.8;white-space:pre-wrap;color:#333}
      .sigs{display:flex;gap:48px;margin-top:72px;padding-top:32px;border-top:2px dashed #ccc}
      .sig{flex:1}
      .sig-label{font-size:9px;font-weight:900;letter-spacing:3px;text-transform:uppercase;color:#888;margin-bottom:12px}
      .sig-name{font-family:cursive;font-size:32px;color:#2563eb;margin:8px 0}
      .sig-name.signed{color:#16a34a}
      .sig-date{font-size:11px;color:#888;margin-top:4px}
      .verified{font-size:11px;color:#16a34a;font-weight:bold;margin-top:6px}
      .pending{font-size:12px;color:#ccc;font-style:italic;margin:16px 0}
      .footer{margin-top:60px;text-align:center;font-size:10px;color:#ccc;letter-spacing:2px;text-transform:uppercase}
      .print-btn{display:block;margin:32px auto 0;padding:10px 28px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer}
      @media print{.print-btn{display:none}}
    </style></head><body>
      <div class="header">
        <div class="brand">beoneofus</div>
        <div class="doc-type">Official Work Contract</div>
      </div>
      <h1>${c.title}</h1>
      <div class="meta">
        <span><strong>Type:</strong> ${c.contract_type || '—'}</span>
        <span><strong>Status:</strong> ${c.status?.toUpperCase()}</span>
        <span><strong>Issued:</strong> ${fmt(c.created_at)}</span>
        ${c.start_date ? `<span><strong>Start:</strong> ${fmt(c.start_date)}</span>` : ''}
        ${c.end_date ? `<span><strong>End:</strong> ${fmt(c.end_date)}</span>` : ''}
        ${c.payment_amount ? `<span><strong>Value:</strong> ${c.payment_currency || 'USD'} ${Number(c.payment_amount).toLocaleString()}</span>` : ''}
      </div>
      ${c.work_description ? `<div class="section"><div class="section-label">Scope of Work</div><p>${c.work_description}</p></div>` : ''}
      ${c.deliverables ? `<div class="section"><div class="section-label">Deliverables</div><p>${c.deliverables}</p></div>` : ''}
      ${c.payment_terms ? `<div class="section"><div class="section-label">Payment Terms</div><p>${c.payment_terms}</p></div>` : ''}
      ${c.payment_schedule ? `<div class="section"><div class="section-label">Payment Schedule</div><p>${c.payment_schedule}</p></div>` : ''}
      <div class="sigs">
        <div class="sig">
          <div class="sig-label">Platform Signature</div>
          <div class="sig-name">${c.admin_signature || 'beoneofus'}</div>
          <div class="verified">✓ Verified & Signed</div>
        </div>
        <div class="sig">
          <div class="sig-label">User Signature</div>
          ${c.user_signature
            ? `<div class="sig-name signed">${c.user_signature}</div><div class="sig-date">${fmt(c.signed_at)}</div><div class="verified">✓ Signed</div>`
            : '<div class="pending">Awaiting signature…</div>'}
        </div>
      </div>
      <div class="footer">beoneofus · Confidential · ${new Date().getFullYear()}</div>
      <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
    </body></html>`;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  };

  // ── User management helpers ───────────────────────────────────────────────
  const isSuspicious = (u: any) => {
    const days = (Date.now() - new Date(u.created_at).getTime()) / 86400000;
    return days > 3 && !u.is_verified && !u.avatar_url;
  };

  const handleSuspendUser = async (userId: string, suspend: boolean) => {
    setUserActionLoading(userId);
    const { error } = await supabase
      .from('profiles')
      .update({ status: suspend ? 'suspended' : 'active' })
      .eq('id', userId);
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: suspend ? 'suspended' : 'active' } : u));
      showToast(suspend ? 'User suspended.' : 'User reinstated.');
    } else {
      showToast(error.message, 'error');
    }
    setUserActionLoading(null);
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`Permanently delete @${username}? This cannot be undone.`)) return;
    setUserActionLoading(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setUsers(prev => prev.filter(u => u.id !== userId));
      showToast(`@${username} deleted permanently.`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
    setUserActionLoading(null);
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractForm.user_id || !contractForm.title || !contractForm.work_description) return;
    setContractProcessing(true);
    try {
      const payload = {
        user_id: contractForm.user_id,
        title: contractForm.title,
        contract_type: contractForm.contract_type,
        work_description: contractForm.work_description,
        deliverables: contractForm.deliverables || null,
        payment_amount: contractForm.payment_amount ? parseFloat(contractForm.payment_amount) : null,
        payment_currency: contractForm.payment_currency,
        payment_terms: contractForm.payment_terms || null,
        payment_schedule: contractForm.payment_schedule || null,
        start_date: contractForm.start_date || null,
        end_date: contractForm.end_date || null,
        notes: contractForm.notes || null,
        status: contractForm.status,
      };

      if (editingContract) {
        // Save revision snapshot before overwriting
        saveRevision(editingContract.id, editingContract);
        // UPDATE
        const { data, error } = await supabase
          .from('contracts')
          .update(payload)
          .eq('id', editingContract.id)
          .select('*, user:profiles!contracts_user_id_fkey(id, username, avatar_url)')
          .single();
        if (error) throw error;
        setContractsList(prev => prev.map(c => c.id === editingContract.id ? data : c));
        showToast('Contract updated!');
      } else {
        // INSERT
        const { data, error } = await supabase
          .from('contracts')
          .insert({ ...payload, created_by: currentUserId, admin_signature: 'beoneofus' })
          .select('*, user:profiles!contracts_user_id_fkey(id, username, avatar_url)')
          .single();
        if (error) throw error;
        if (contractForm.status === 'sent') {
          await supabase.from('notifications').insert({
            receiver_id: contractForm.user_id,
            actor_id: currentUserId,
            type: 'message',
            content: `sent you a contract to review and sign: "${contractForm.title}"`,
          });
        }
        setContractsList(prev => [data, ...prev]);
        showToast('Contract created & sent!');
      }

      closeContractModal();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setContractProcessing(false);
    }
  };

  const handleContractStatusUpdate = async (contractId: string, newStatus: string) => {
    const { error } = await supabase.from('contracts').update({ status: newStatus }).eq('id', contractId);
    if (!error) {
      setContractsList(prev => prev.map(c => c.id === contractId ? { ...c, status: newStatus } : c));
      showToast(`Contract marked as ${newStatus}.`);

      if (newStatus === 'sent') {
        const contract = contractsList.find(c => c.id === contractId);
        if (contract?.user_id) {
          await supabase.from('notifications').insert({
            receiver_id: contract.user_id,
            actor_id: currentUserId,
            type: 'message',
            content: `sent you a contract to review and sign: "${contract.title}"`,
          });
        }
      }
    } else {
      showToast('Failed to update status.', 'error');
    }
  };

  const filteredContracts = contractsList.filter(c => {
    if (contractFilter === 'pending') return ['sent', 'viewed'].includes(c.status);
    if (contractFilter === 'signed') return ['signed', 'completed'].includes(c.status);
    if (contractFilter === 'draft') return c.status === 'draft';
    return true;
  });

  const filteredTasks = tasks.filter(t => {
    if (taskFilter === 'pending') return t.status === 'pending' || t.status === 'in_progress';
    if (taskFilter === 'completed') return t.status === 'completed';
    if (taskFilter === 'high') return t.priority?.toLowerCase() === 'high' && t.status !== 'completed';
    return true;
  });

  const filteredUsers = users.filter(u => {
    const matchSearch = u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.status?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase());
    if (!matchSearch) return false;
    if (userFilter === 'verified')   return u.is_verified;
    if (userFilter === 'unverified') return !u.is_verified;
    if (userFilter === 'suspicious') return isSuspicious(u);
    if (userFilter === 'banned')     return u.status === 'suspended';
    return true;
  });

  // ── Loading / no access ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!hasAccess) return null;

  const progress = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 sm:p-8 animate-in fade-in duration-500">
      {/* Toast */}
      {toast.msg && (
        <div className={`fixed bottom-6 right-6 z-[500] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-sm ${toast.type === 'error' ? 'bg-white dark:bg-gray-900 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400' : 'bg-white dark:bg-gray-900 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400'}`}>
          {toast.type === 'error' ? <AlertTriangle size={15} className="shrink-0" /> : <Check size={15} className="shrink-0" />}
          <span className="text-xs font-bold">{toast.msg}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="flex items-center gap-5 relative z-10">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100 dark:bg-gray-800 border-4 border-white dark:border-gray-900 shadow-lg flex items-center justify-center text-xl font-black text-gray-400 uppercase overflow-hidden shrink-0">
              {profile?.avatar_url
                ? <Image src={profile.avatar_url} alt="avatar" fill sizes="80px" className="object-cover" />
                : (profile?.username?.substring(0, 2) || 'FD')}
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <Crown size={14} /> {isAdmin ? 'Admin & Founder' : 'Co-Founder Node Active'}
              </p>
              <h1 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
                Welcome, {profile?.username || 'Founder'}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium text-sm flex items-center gap-2">
                <Calendar size={14} /> {currentDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 relative z-10 w-full md:w-auto flex-wrap">
            <Link href="/member-dashboard" className="flex items-center justify-center gap-2 px-5 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold transition-all text-sm border border-gray-200 dark:border-gray-700">
              <Users size={15} /> Member View
            </Link>
            <Link href="/dash/feed" className="flex items-center justify-center gap-2 px-5 py-3 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-bold transition-all shadow-md text-sm">
              <Terminal size={15} /> Dashboard
            </Link>
            {isAdmin && (
              <Link href="/dash/more" className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md text-sm">
                <Shield size={15} /> Admin Panel <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </header>

        {/* Tab Bar */}
        <div className="flex gap-1 p-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-1 justify-center ${activeTab === tab.id ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ─────────────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Users,         label: 'Team Members',     value: stats.team,         color: 'blue',   sub: 'Active co-founders' },
                { icon: Crown,         label: 'Pending Apps',     value: stats.pendingApps,  color: 'amber',  sub: 'Awaiting review' },
                { icon: ClipboardList, label: 'Total Tasks',      value: stats.totalTasks,   color: 'violet', sub: 'Across all users' },
                { icon: CheckCircle2,  label: 'Task Completion',  value: `${progress}%`,     color: 'emerald', sub: `${stats.completedTasks}/${stats.totalTasks} done` },
              ].map(({ icon: Icon, label, value, color, sub }) => (
                <div key={label} className={`bg-white dark:bg-gray-900 p-6 rounded-[2rem] border shadow-sm transition-all hover:shadow-md ${
                  color === 'blue' ? 'border-blue-200 dark:border-blue-500/20' :
                  color === 'amber' ? 'border-amber-200 dark:border-amber-500/20' :
                  color === 'violet' ? 'border-violet-200 dark:border-violet-500/20' :
                  'border-emerald-200 dark:border-emerald-500/20'
                }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                    color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' :
                    color === 'amber' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' :
                    color === 'violet' ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' :
                    'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    <Icon size={20} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{value}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1 font-medium">{sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Review Applications', desc: 'Accept or decline co-founder requests', icon: Crown, tab: 'applications', color: 'amber' },
                { label: 'Manage Team Tasks',   desc: 'Assign and track all team objectives',  icon: ClipboardList, tab: 'tasks', color: 'violet' },
                { label: 'Browse Users',         desc: 'View all platform members and their roles', icon: Users, tab: 'users', color: 'blue' },
                { label: 'Contracts',            desc: 'Create and send work contracts to users',   icon: ScrollText, tab: 'contracts', color: 'emerald' },
              ].map(({ label, desc, icon: Icon, tab, color }) => (
                <button key={label} onClick={() => setActiveTab(tab)}
                  className="flex items-start gap-4 p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-blue-500/40 hover:shadow-md transition-all text-left group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' :
                    color === 'amber' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' :
                    'bg-violet-50 dark:bg-violet-900/20 text-violet-500'
                  }`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{label}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── APPLICATIONS ──────────────────────────────────────────────────────── */}
        {activeTab === 'applications' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Crown size={20} className="text-amber-500" /> Co-Founder Applications
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({applications.length})</span>
              </h2>
              <button onClick={fetchApplications} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 transition-all">
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            {appsLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={24} /></div>
            ) : applications.length === 0 ? (
              <div className="py-16 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                <Crown size={40} className="mx-auto mb-4 opacity-20" />
                <p className="font-bold">No applications yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map(app => (
                  <div key={app.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-gray-500 uppercase">
                          {app.profiles?.avatar_url
                            ? <Image src={app.profiles.avatar_url} alt="avatar" fill sizes="40px" className="object-cover" />
                            : app.profiles?.username?.substring(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">@{app.profiles?.username || 'Unknown'}</p>
                            <Badge color={statusColor(app.status)}>{app.status}</Badge>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {app.role === 'cofounder' ? 'Co-Founder Application' : 'Member Application'} · {getRelativeTime(app.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setSelectedApp(selectedApp?.id === app.id ? null : app)}
                          className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700 transition-all"
                        >
                          {selectedApp?.id === app.id ? 'Close' : 'View'}
                        </button>
                        {app.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApplicationAction(app.id, 'declined', app.user_id, app.role)}
                              disabled={appActionLoading}
                              className="px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl text-xs font-bold border border-red-200 dark:border-red-500/20 transition-all disabled:opacity-50"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => handleApplicationAction(app.id, 'accepted', app.user_id, app.role)}
                              disabled={appActionLoading}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 flex items-center gap-1"
                            >
                              {appActionLoading ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />}
                              Accept
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {selectedApp?.id === app.id && app.reason && (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                        {Object.entries(typeof app.reason === 'string' ? (() => { try { return JSON.parse(app.reason); } catch { return { Response: app.reason }; } })() : (app.reason || {})).map(([q, a]) => (
                          <div key={q}>
                            <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">{q}</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{String(a)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── USERS ─────────────────────────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Users size={20} className="text-blue-500" /> Platform Users
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({filteredUsers.length})</span>
              </h2>
              <button onClick={fetchUsers} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 transition-all">
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            {/* Search + filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search by name, email, or status…"
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 pl-9 pr-4 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 transition-all" />
              </div>
              <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl shrink-0">
                {[
                  { id: 'all',         label: 'All' },
                  { id: 'verified',    label: '✓ Verified' },
                  { id: 'unverified',  label: 'Unverified' },
                  { id: 'suspicious',  label: '⚠ Suspicious' },
                  { id: 'banned',      label: 'Banned' },
                ].map(f => (
                  <button key={f.id} onClick={() => setUserFilter(f.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${userFilter === f.id ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Suspicious banner */}
            {userFilter === 'suspicious' && filteredUsers.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-300 font-bold">
                <AlertOctagon size={14} className="shrink-0" />
                {filteredUsers.length} user{filteredUsers.length > 1 ? 's' : ''} flagged — unverified accounts with no avatar older than 3 days.
              </div>
            )}

            {usersLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={24} /></div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-gray-400 dark:text-gray-600 text-sm">No users match this filter.</div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map(user => {
                  const suspicious = isSuspicious(user);
                  const suspended  = user.status === 'suspended';
                  const isExpanded = expandedUserId === user.id;
                  const isActioning = userActionLoading === user.id;
                  const daysSince = Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000);

                  return (
                    <div key={user.id} className={`bg-white dark:bg-gray-900 border rounded-2xl transition-all ${
                      suspended    ? 'border-red-200 dark:border-red-500/20' :
                      suspicious   ? 'border-amber-200 dark:border-amber-500/20' :
                      'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}>
                      {/* Card header row */}
                      <div className="flex items-center gap-3 p-4">
                        <div className="relative w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-gray-500 uppercase">
                          {user.avatar_url
                            ? <Image src={user.avatar_url} alt="avatar" fill sizes="44px" className="object-cover" />
                            : user.username?.substring(0, 2)}
                          {suspended && (
                            <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                              <Ban size={14} className="text-red-500" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">@{user.username}</p>
                            {user.is_admin && <Badge color="amber2">Admin</Badge>}
                            {user.role && user.role !== 'member' && <Badge color="violet">{user.role}</Badge>}
                            {user.is_verified && <Badge color="blue">✓ Verified</Badge>}
                            {user.is_premium && <Badge color="amber">Premium</Badge>}
                            {suspended && <Badge color="red">Suspended</Badge>}
                            {suspicious && !suspended && <Badge color="amber">⚠ Suspicious</Badge>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            {user.email && <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate flex items-center gap-1"><Mail size={9} />{user.email}</p>}
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1"><CalendarDays size={9} />{daysSince}d ago</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => window.open(`/u/${user.username}`, '_blank')}
                            className="p-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-500 rounded-lg border border-gray-200 dark:border-gray-700 transition-all" title="View profile">
                            <ExternalLink size={13} />
                          </button>
                          <button onClick={() => { setActiveTab('contracts'); setTimeout(() => setShowContractModal(true), 50); setContractForm(prev => ({ ...prev, user_id: user.id })); }}
                            className="p-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-gray-400 hover:text-emerald-500 rounded-lg border border-gray-200 dark:border-gray-700 transition-all" title="Create contract">
                            <ScrollText size={13} />
                          </button>
                          <button onClick={() => { setActiveTab('tasks'); setTaskForm(prev => ({ ...prev, assignee_id: user.id })); setShowTaskModal(true); }}
                            className="p-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-gray-400 hover:text-violet-500 rounded-lg border border-gray-200 dark:border-gray-700 transition-all" title="Assign task">
                            <ClipboardList size={13} />
                          </button>
                          <button
                            onClick={() => handleSuspendUser(user.id, !suspended)}
                            disabled={isActioning || user.id === currentUserId}
                            className={`p-1.5 rounded-lg border transition-all disabled:opacity-40 ${suspended ? 'bg-green-50 dark:bg-green-900/20 text-green-500 hover:bg-green-100 border-green-200 dark:border-green-500/20' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-500 border-gray-200 dark:border-gray-700'}`}
                            title={suspended ? 'Reinstate user' : 'Suspend user'}>
                            {isActioning ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            disabled={isActioning || user.id === currentUserId}
                            className="p-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-red-200 transition-all disabled:opacity-40"
                            title="Delete user permanently">
                            <Trash2 size={13} />
                          </button>
                          <button onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                            className={`p-1.5 rounded-lg border transition-all ${isExpanded ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500 border-blue-200 dark:border-blue-500/20' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700'}`}>
                            <ChevronRight size={13} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* Expanded detail panel */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-800">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Role</p>
                              <p className="text-sm font-bold text-gray-800 dark:text-gray-200 capitalize">{user.role || 'member'}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Verified</p>
                              <p className={`text-sm font-bold ${user.is_verified ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                {user.is_verified ? '✓ Yes' : '✗ No'}
                              </p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Premium</p>
                              <p className={`text-sm font-bold ${user.is_premium ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
                                {user.is_premium ? '★ Yes' : 'No'}
                              </p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                              <p className="text-sm font-bold text-gray-800 dark:text-gray-200 capitalize">{user.status || 'active'}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Joined</p>
                              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{new Date(user.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Avatar</p>
                              <p className={`text-sm font-bold ${user.avatar_url ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-400'}`}>
                                {user.avatar_url ? '✓ Set' : '✗ Missing'}
                              </p>
                            </div>
                          </div>
                          {user.email && (
                            <div className="mt-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Email</p>
                              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{user.email}</p>
                            </div>
                          )}
                          {suspicious && (
                            <div className="mt-3 flex items-start gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                              <AlertOctagon size={13} className="text-amber-500 shrink-0 mt-0.5" />
                              <p className="text-[11px] text-amber-700 dark:text-amber-300 font-bold leading-relaxed">
                                Flagged as suspicious — account is older than 3 days with no avatar and no email verification.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── CONTRACTS ────────────────────────────────────────────────────────── */}
        {activeTab === 'contracts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <ScrollText size={20} className="text-emerald-500" /> Contracts
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({filteredContracts.length})</span>
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={fetchContracts} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 transition-all">
                  <RefreshCw size={12} /> Refresh
                </button>
                <button
                  onClick={() => setShowContractModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Plus size={14} /> New Contract
                </button>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl w-fit">
              {[
                { id: 'all', label: 'All' },
                { id: 'draft', label: 'Draft' },
                { id: 'pending', label: 'Pending' },
                { id: 'signed', label: 'Signed' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setContractFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${contractFilter === f.id ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {contractsLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-emerald-500" size={24} /></div>
            ) : filteredContracts.length === 0 ? (
              <div className="py-16 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                <ScrollText size={40} className="mx-auto mb-4 opacity-20" />
                <p className="font-bold">No contracts found</p>
                <button onClick={() => setShowContractModal(true)} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all">
                  Create First Contract
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredContracts.map(c => {
                  const statusColors: Record<string, string> = {
                    draft:     'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
                    sent:      'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
                    viewed:    'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
                    signed:    'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
                    completed: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
                    expired:   'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20',
                    cancelled: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20',
                  };
                  return (
                    <div key={c.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-all">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                          <ScrollText size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <h3 className="text-sm font-bold text-gray-900 dark:text-white">{c.title}</h3>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusColors[c.status] || statusColors.draft}`}>
                                  {c.status}
                                </span>
                                {c.contract_type && <Badge color="gray">{c.contract_type}</Badge>}
                                {c.user?.username && (
                                  <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">→ @{c.user.username}</span>
                                )}
                                {c.payment_amount && (
                                  <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold">
                                    ${Number(c.payment_amount).toLocaleString()} {c.payment_currency}
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0 flex-wrap">
                              <button
                                onClick={() => setPreviewingContract(c)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl text-[11px] font-bold border border-blue-200 dark:border-blue-500/20 transition-all"
                              >
                                <Eye size={11} /> Preview
                              </button>
                              <button
                                onClick={() => printContract(c)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-[11px] font-bold border border-gray-200 dark:border-gray-700 transition-all"
                              >
                                <Printer size={11} /> Print
                              </button>
                              <button
                                onClick={() => setShowRevisionsFor(showRevisionsFor === c.id ? null : c.id)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-[11px] font-bold border border-gray-200 dark:border-gray-700 transition-all"
                              >
                                <History size={11} /> History
                              </button>
                              <button
                                onClick={() => openEditContract(c)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-[11px] font-bold border border-gray-200 dark:border-gray-700 transition-all"
                              >
                                <PenLine size={11} /> Edit
                              </button>
                              {c.status === 'draft' && (
                                <button
                                  onClick={() => handleContractStatusUpdate(c.id, 'sent')}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl text-[11px] font-bold border border-blue-200 dark:border-blue-500/20 transition-all"
                                >
                                  <Send size={11} /> Send to User
                                </button>
                              )}
                              {['signed', 'viewed'].includes(c.status) && (
                                <button
                                  onClick={() => handleContractStatusUpdate(c.id, 'completed')}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl text-[11px] font-bold border border-emerald-200 dark:border-emerald-500/20 transition-all"
                                >
                                  <CheckCircle2 size={11} /> Mark Complete
                                </button>
                              )}
                              {!['cancelled', 'expired', 'completed'].includes(c.status) && (
                                <button
                                  onClick={() => handleContractStatusUpdate(c.id, 'cancelled')}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl text-[11px] font-bold border border-red-200 dark:border-red-500/20 transition-all"
                                >
                                  <XCircle size={11} /> Cancel
                                </button>
                              )}
                            </div>
                          </div>
                          {c.work_description && (
                            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-2 line-clamp-2 leading-relaxed">{c.work_description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="text-[10px] text-gray-400 dark:text-gray-600">Created {new Date(c.created_at).toLocaleDateString()}</span>
                            {c.end_date && <span className="text-[10px] text-gray-400 dark:text-gray-600">Due {new Date(c.end_date).toLocaleDateString()}</span>}
                            {c.signed_at && <span className="text-[10px] text-emerald-500 font-bold">✓ Signed {new Date(c.signed_at).toLocaleDateString()}</span>}
                          </div>
                          {c.user_signature && (
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">Signed as: {c.user_signature}</p>
                          )}
                        </div>
                      </div>

                      {/* Revision history panel */}
                      {showRevisionsFor === c.id && (() => {
                        const revs = getRevisions(c.id);
                        return (
                          <div className="border-t border-dashed border-gray-200 dark:border-gray-700 px-5 py-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><History size={10} /> Edit History (last {revs.length} saves)</p>
                            {revs.length === 0 ? (
                              <p className="text-[12px] text-gray-400 italic">No edits recorded yet. History is saved from the next edit onwards.</p>
                            ) : (
                              <div className="space-y-2">
                                {revs.map((rev: any, i: number) => (
                                  <div key={i} className="flex items-start gap-3 text-[11px]">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 mt-1.5 shrink-0" />
                                    <div className="min-w-0">
                                      <span className="text-gray-500 dark:text-gray-400">{new Date(rev.ts).toLocaleString()} — </span>
                                      <span className="text-gray-700 dark:text-gray-300 font-medium">{rev.data.title}</span>
                                      {rev.data.status && <span className="ml-1 text-gray-400">({rev.data.status})</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TASKS ─────────────────────────────────────────────────────────────── */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <ClipboardList size={20} className="text-violet-500" /> All Tasks
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({filteredTasks.length})</span>
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={fetchTasks} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 transition-all">
                  <RefreshCw size={12} /> Refresh
                </button>
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Plus size={14} /> Assign Task
                </button>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl w-fit">
              {['all', 'pending', 'completed', 'high'].map(f => (
                <button
                  key={f}
                  onClick={() => setTaskFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${taskFilter === f ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {tasksLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={24} /></div>
            ) : filteredTasks.length === 0 ? (
              <div className="py-16 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                <ClipboardList size={40} className="mx-auto mb-4 opacity-20" />
                <p className="font-bold">No tasks found</p>
                <button onClick={() => setShowTaskModal(true)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all">
                  Assign First Task
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map(task => (
                  <div key={task.id} className={`bg-white dark:bg-gray-900 border rounded-2xl p-5 transition-all hover:shadow-md ${task.status === 'completed' ? 'border-gray-100 dark:border-gray-800 opacity-75' : 'border-gray-200 dark:border-gray-700 hover:border-blue-500/30'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className={`font-bold text-sm ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>{task.title}</h3>
                          <Badge color={statusColor(task.status)}>{task.status?.replace('_', ' ')}</Badge>
                          {task.priority && task.status !== 'completed' && (
                            <Badge color={priorityColor(task.priority)}>{task.priority}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">{task.description}</p>

                        <div className="flex items-center gap-4 mt-3 flex-wrap">
                          {task.assignee && (
                            <div className="flex items-center gap-1.5">
                              <div className="relative w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center text-[8px] font-bold text-gray-500">
                                {task.assignee.avatar_url ? <Image src={task.assignee.avatar_url} alt="a" fill sizes="20px" className="object-cover" /> : task.assignee.username?.substring(0, 2).toUpperCase()}
                              </div>
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">→ @{task.assignee.username}</span>
                            </div>
                          )}
                          {task.assigner && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-600 font-medium">by @{task.assigner.username}</span>
                          )}
                          <span className="text-[10px] text-gray-400 dark:text-gray-600 font-medium flex items-center gap-1">
                            <Clock size={10} /> {getRelativeTime(task.created_at)}
                          </span>
                        </div>
                      </div>

                      {task.status !== 'completed' && (
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                            className="p-2 bg-gray-50 dark:bg-gray-800 hover:bg-emerald-500 text-gray-400 hover:text-white border border-gray-200 dark:border-gray-700 hover:border-emerald-500 rounded-xl transition-all"
                            title="Mark complete"
                          >
                            <Check size={16} />
                          </button>
                          {task.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}
                              className="px-2 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Start
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Contract Preview Modal ────────────────────────────────────────────── */}
      {previewingContract && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPreviewingContract(null)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-y-auto animate-in zoom-in-95 duration-200" style={{ maxHeight: '90vh' }}>
            <div className="sticky top-0 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-xl flex items-center justify-center"><ScrollText size={16} /></div>
                <div>
                  <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Preview — as seen by user</p>
                  <p className="text-sm font-black text-gray-900 dark:text-white">{previewingContract.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => printContract(previewingContract)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-xs font-bold transition-all">
                  <Printer size={13} /> Print
                </button>
                <button onClick={() => setPreviewingContract(null)} className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {/* Status + meta */}
              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  previewingContract.status === 'signed' || previewingContract.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' :
                  previewingContract.status === 'sent' || previewingContract.status === 'viewed' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20' :
                  'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                }`}>{previewingContract.status}</span>
                {previewingContract.contract_type && <span className="text-[10px] font-bold bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">{previewingContract.contract_type}</span>}
              </div>
              {/* Period + payment */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Period</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{previewingContract.start_date ? new Date(previewingContract.start_date).toLocaleDateString() : '—'}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">to {previewingContract.end_date ? new Date(previewingContract.end_date).toLocaleDateString() : '—'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Value</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{previewingContract.payment_amount ? `${previewingContract.payment_currency} ${Number(previewingContract.payment_amount).toLocaleString()}` : '—'}</p>
                </div>
              </div>
              {previewingContract.work_description && <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Scope of Work</p><div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800"><p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{previewingContract.work_description}</p></div></div>}
              {previewingContract.deliverables && <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Deliverables</p><div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800"><p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{previewingContract.deliverables}</p></div></div>}
              {previewingContract.payment_terms && <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Payment Terms</p><div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800"><p className="text-sm text-gray-700 dark:text-gray-300">{previewingContract.payment_terms}</p></div></div>}
              {/* Signature block */}
              <div className="border-t border-dashed border-gray-200 dark:border-gray-700 pt-5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Signatures</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-2">Platform</p>
                    <p className="font-black text-2xl text-blue-600 dark:text-blue-400" style={{ fontFamily: 'cursive' }}>{previewingContract.admin_signature || 'beoneofus'}</p>
                    <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-2">✓ Verified & Signed</p>
                  </div>
                  <div className={`border rounded-2xl p-4 ${previewingContract.user_signature ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-500/20' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'}`}>
                    <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${previewingContract.user_signature ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>User Signature</p>
                    {previewingContract.user_signature
                      ? <><p className="font-black text-2xl text-emerald-600 dark:text-emerald-400" style={{ fontFamily: 'cursive' }}>{previewingContract.user_signature}</p><p className="text-[9px] text-gray-400 mt-1">{previewingContract.signed_at ? new Date(previewingContract.signed_at).toLocaleDateString() : ''}</p></>
                      : <p className="text-xs text-gray-400 italic mt-2">Awaiting signature…</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Contract Modal ─────────────────────────────────────────────── */}
      {showContractModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeContractModal} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] shadow-2xl overflow-y-auto animate-in zoom-in-95 duration-200" style={{ maxHeight: '90vh' }}>
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between rounded-t-[2rem] z-10">
              <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                <ScrollText size={17} className="text-emerald-500" /> {editingContract ? 'Edit Contract' : 'New Work Contract'}
              </h2>
              <button onClick={closeContractModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 transition-colors">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateContract} className="p-6 space-y-4">

              {/* Template bar */}
              {!editingContract && (
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setShowTemplateList(!showTemplateList)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 border border-violet-200 dark:border-violet-500/20 rounded-xl text-[11px] font-bold transition-all">
                      <BookOpen size={12} /> Load Template {contractTemplates.length > 0 && `(${contractTemplates.length})`}
                    </button>
                    {(contractForm.work_description || contractForm.title) && (
                      <button type="button" onClick={saveAsTemplate}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl text-[11px] font-bold transition-all">
                        Save as Template
                      </button>
                    )}
                  </div>
                  {showTemplateList && (
                    <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-80 overflow-hidden">
                      {contractTemplates.length === 0 ? (
                        <p className="p-4 text-xs text-gray-400 text-center">No templates saved yet. Fill the form and click "Save as Template".</p>
                      ) : contractTemplates.map((t: any) => (
                        <div key={t.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-0">
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => applyTemplate(t)}>
                            <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{t.name}</p>
                            <p className="text-[10px] text-gray-400">{t.contract_type} · {new Date(t.savedAt).toLocaleDateString()}</p>
                          </div>
                          <button type="button" onClick={() => deleteTemplate(t.id)} className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors shrink-0">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Assign to user */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Assign To *</label>
                <select required value={contractForm.user_id} onChange={e => setContractForm({ ...contractForm, user_id: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all text-gray-900 dark:text-gray-100">
                  <option value="">Select a user…</option>
                  {allUsers.map(u => <option key={u.id} value={u.id}>@{u.username}</option>)}
                </select>
              </div>

              {/* Title + Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Contract Title *</label>
                  <input required type="text" value={contractForm.title} onChange={e => setContractForm({ ...contractForm, title: e.target.value })}
                    placeholder="e.g. Frontend Dev Contract"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-all text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Type</label>
                  <select value={contractForm.contract_type} onChange={e => setContractForm({ ...contractForm, contract_type: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-all text-gray-900 dark:text-gray-100">
                    {['Project', 'Freelance', 'Employment', 'Service', 'Consulting', 'Internship'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Work description */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Scope of Work *</label>
                <textarea required rows={4} value={contractForm.work_description} onChange={e => setContractForm({ ...contractForm, work_description: e.target.value })}
                  placeholder="Describe the work to be done in detail…"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-all resize-none text-gray-900 dark:text-gray-100" />
              </div>

              {/* Deliverables */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Deliverables</label>
                <textarea rows={3} value={contractForm.deliverables} onChange={e => setContractForm({ ...contractForm, deliverables: e.target.value })}
                  placeholder="List the expected deliverables…"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-all resize-none text-gray-900 dark:text-gray-100" />
              </div>

              {/* Payment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Total Amount</label>
                  <div className="relative">
                    <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="number" min="0" step="0.01" value={contractForm.payment_amount} onChange={e => setContractForm({ ...contractForm, payment_amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-all text-gray-900 dark:text-gray-100" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Currency</label>
                  <select value={contractForm.payment_currency} onChange={e => setContractForm({ ...contractForm, payment_currency: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-all text-gray-900 dark:text-gray-100">
                    {['USD', 'EUR', 'GBP', 'KES', 'NGN', 'ZAR'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Payment terms */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Payment Terms</label>
                <input type="text" value={contractForm.payment_terms} onChange={e => setContractForm({ ...contractForm, payment_terms: e.target.value })}
                  placeholder="e.g. 50% upfront, 50% on completion"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-all text-gray-900 dark:text-gray-100" />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Start Date</label>
                  <input type="date" value={contractForm.start_date} onChange={e => setContractForm({ ...contractForm, start_date: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-all text-gray-500 dark:text-gray-400 [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">End Date</label>
                  <input type="date" value={contractForm.end_date} onChange={e => setContractForm({ ...contractForm, end_date: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-all text-gray-500 dark:text-gray-400 [color-scheme:dark]" />
                </div>
              </div>

              {/* Status on create */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">On Create</label>
                <div className="flex gap-2">
                  {[{ v: 'draft', label: 'Save as Draft' }, { v: 'sent', label: 'Send Immediately' }].map(opt => (
                    <button type="button" key={opt.v} onClick={() => setContractForm({ ...contractForm, status: opt.v })}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${contractForm.status === opt.v ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-emerald-500'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={contractProcessing || !contractForm.user_id || !contractForm.title || !contractForm.work_description}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                {contractProcessing ? <Loader2 size={16} className="animate-spin" /> : <ScrollText size={16} />}
                {contractProcessing
                  ? (editingContract ? 'Saving…' : 'Creating…')
                  : editingContract
                    ? 'Save Changes'
                    : contractForm.status === 'draft' ? 'Save Contract' : 'Create & Send Contract'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Assign Task Modal ──────────────────────────────────────────────────── */}
      {showTaskModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowTaskModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowTaskModal(false)} className="absolute top-5 right-5 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 transition-colors">
              <X size={18} />
            </button>
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <ClipboardList size={20} className="text-violet-500" /> Assign Task
            </h2>
            <form onSubmit={handleAssignTask} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Assign To *</label>
                <select
                  required
                  value={taskForm.assignee_id}
                  onChange={e => setTaskForm({ ...taskForm, assignee_id: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select a user…</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>@{u.username}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Title *</label>
                <input
                  required
                  type="text"
                  value={taskForm.title}
                  onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="Task title…"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Description</label>
                <textarea
                  rows={3}
                  value={taskForm.description}
                  onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Add context and details…"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all resize-none text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all text-gray-900 dark:text-gray-100"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={taskForm.due_date}
                    onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all text-gray-500 dark:text-gray-400 [color-scheme:dark]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={taskProcessing || !taskForm.assignee_id || !taskForm.title}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {taskProcessing ? <Loader2 size={18} className="animate-spin" /> : <><Plus size={16} /> Assign Task</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
