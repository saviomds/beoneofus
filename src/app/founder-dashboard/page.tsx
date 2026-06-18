"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Briefcase, Activity, ArrowRight, Target, Loader2, CheckCircle2,
  Check, Clock, Calendar, Zap, Terminal, ShieldCheck, X, Plus, Crown,
  Search, BarChart3, ClipboardList, RefreshCw, Shield, UserCheck, UserX,
  ChevronDown, AlertTriangle, Filter, Image as ImageIcon,
  ScrollText, FileText, Send, DollarSign, PenLine, XCircle, Eye,
  Printer, History, Trash2, Ban, ExternalLink, AlertOctagon,
  ChevronRight, Mail, CalendarDays, Star, BookOpen, Lock, Unlock,
  Package, Truck, ShoppingBag, Play, Pause, Square,
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
  if (s === 'declined' || s === 'rejected' || s === 'removed') return 'red';
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

function CircularProgress({ rings }: { rings: { value: number; max: number; color: string; r: number; sw: number }[] }) {
  const S = 160, C = S / 2;
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
      {rings.map(({ value, max, color, r, sw }, i) => {
        const circ = 2 * Math.PI * r;
        const fill = Math.min(value / (max || 1), 1) * circ;
        return (
          <g key={i}>
            <circle cx={C} cy={C} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={sw} />
            <circle cx={C} cy={C} r={r} fill="none" stroke={color} strokeWidth={sw}
              strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
              transform={`rotate(-90 ${C} ${C})`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
          </g>
        );
      })}
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',     label: 'Overview',     icon: BarChart3,    protected: false },
  { id: 'applications', label: 'Applications', icon: Crown,        protected: true  },
  { id: 'users',        label: 'Users',        icon: Users,        protected: true  },
  { id: 'orders',       label: 'Orders',       icon: Package,      protected: true  },
  { id: 'tasks',        label: 'Tasks',        icon: ClipboardList, protected: false },
  { id: 'contracts',    label: 'Contracts',    icon: ScrollText,   protected: true  },
  { id: 'platform',     label: 'Platform',     icon: Zap,          protected: true  },
];

const PROTECTED_TABS = new Set(['applications', 'users', 'orders', 'contracts', 'platform']);

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

  // Orders tab
  const [shopOrders, setShopOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderActionLoading, setOrderActionLoading] = useState<string | null>(null);

  // Dashboard preview (per-user lazy-loaded data)
  const [userDashPreviews, setUserDashPreviews] = useState<Record<string, { tasks: any[]; notifications: any[]; loading: boolean }>>({});

  // Toast
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const showToast = useCallback((msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500);
  }, []);

  // Platform version
  const [pvData, setPvData] = useState<{ version: string; label: string; date: string; notes: string } | null>(null);
  const [pvLoading, setPvLoading] = useState(false);
  const [pvSaving, setPvSaving] = useState(false);
  const [pvForm, setPvForm] = useState({ version: '', label: 'Core', date: '', notes: '' });

  // Password gate for protected tabs
  const [protectedUnlocked, setProtectedUnlocked] = useState(() =>
    typeof window !== 'undefined' && sessionStorage.getItem('fdash_unlocked') === 'true'
  );
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordVerifying, setPasswordVerifying] = useState(false);

  // ── Bento grid widget state ────────────────────────────────────────────────
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [checklistItems, setChecklistItems] = useState([
    { id: 1, text: 'Review pending applications', done: false },
    { id: 2, text: 'Assign weekly tasks to team', done: true },
    { id: 3, text: 'Update platform version notes', done: false },
    { id: 4, text: 'Check co-founder contracts', done: false },
  ]);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [bentoTaskTab, setBentoTaskTab] = useState<'upcoming' | 'overdue' | 'completed'>('upcoming');
  const formatTimer = (s: number) =>
    [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(n => String(n).padStart(2, '0')).join(':');

  const handleTabClick = useCallback(async (tabId: string) => {
    if (PROTECTED_TABS.has(tabId) && !protectedUnlocked) {
      setPendingTab(tabId);
      setPasswordInput('');
      setPasswordError('');
      setShowPasswordModal(true);
      return;
    }
    setActiveTab(tabId);
  }, [isAdmin, protectedUnlocked]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordVerifying(true);
    setPasswordError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/verify-section-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ password: passwordInput }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Incorrect password');
      sessionStorage.setItem('fdash_unlocked', 'true');
      setProtectedUnlocked(true);
      setShowPasswordModal(false);
      if (pendingTab) setActiveTab(pendingTab);
      setPendingTab(null);
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setPasswordVerifying(false);
    }
  };

  const handleLock = () => {
    sessionStorage.removeItem('fdash_unlocked');
    setProtectedUnlocked(false);
    if (PROTECTED_TABS.has(activeTab)) setActiveTab('overview');
    showToast('Protected sections locked.');
  };

  // ── Auth & access check ────────────────────────────────────────────────────
  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));

    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/auth'); return; }

      const uid = session.user.id;
      setCurrentUserId(uid);

      // Run profile and application checks in parallel to eliminate sequential round trips
      const [{ data: profileData }, { data: apps }] = await Promise.all([
        supabase.from('profiles')
          .select('username, avatar_url, is_verified, is_admin, role')
          .eq('id', uid)
          .single(),
        supabase.from('founder_applications')
          .select('status, intended_role')
          .eq('user_id', uid)
          .eq('status', 'accepted')
          .in('intended_role', ['cofounder', 'member']),
      ]);

      if (profileData) {
        setProfile(profileData);
        if (profileData.is_admin) setIsAdmin(true);
      }

      const isAdminUser = !!profileData?.is_admin;
      if (!isAdminUser) {
        const founderApp = apps?.find((a: any) => a.intended_role === 'cofounder');
        if (!founderApp) {
          const memberApp = apps?.find((a: any) => a.intended_role === 'member');
          router.push(memberApp ? '/member-dashboard' : '/dash/feed');
          return;
        }
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
      const roleLabel = appTitle === 'cofounder' ? 'co-founder' : 'co-member';
      await supabase.from('notifications').insert({
        receiver_id: applicantId,
        actor_id: currentUserId,
        type: 'message',
        content: `Your ${roleLabel} application was ${status}. ${status === 'accepted' ? 'Welcome to the team!' : 'Thank you for your interest.'}`,
      });

      // If accepted, update profile role based on intended_role
      if (status === 'accepted') {
        const profileRole = appTitle === 'cofounder' ? 'founder' : 'member';
        await supabase.from('profiles').update({ role: profileRole }).eq('id', applicantId);
      }

      // Send email notification with correct dashboard link
      const dashboardLink = status === 'accepted'
        ? (appTitle === 'cofounder' ? '/founder-dashboard' : '/member-dashboard')
        : undefined;
      try {
        await fetch('/api/notify-applicant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applicationId: appId, applicantId, status, role: appTitle, dashboardLink }),
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

  // ── Users — fetched via admin API (service role key bypasses RLS) ──────────
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/users?limit=200', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const json = await res.json();
      const data = json.users || [];
      setUsers(data);
      setAllUsers(data);
    } catch {
      // silently fall back to empty
    }
    setUsersLoading(false);
  }, []);

  useEffect(() => {
    if (hasAccess && activeTab === 'users') fetchUsers();
  }, [hasAccess, activeTab, fetchUsers]);

  const fetchUserDashPreview = useCallback(async (userId: string) => {
    setUserDashPreviews(prev => ({ ...prev, [userId]: { tasks: [], notifications: [], loading: true } }));
    const [{ data: tasks }, { data: notifications }] = await Promise.all([
      supabase.from('tasks')
        .select('id, title, status, priority, due_date, created_at')
        .eq('assignee_id', userId)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase.from('notifications')
        .select('id, content, type, created_at')
        .eq('receiver_id', userId)
        .order('created_at', { ascending: false })
        .limit(4),
    ]);
    setUserDashPreviews(prev => ({ ...prev, [userId]: { tasks: tasks || [], notifications: notifications || [], loading: false } }));
  }, []);

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
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  useEffect(() => {
    if (hasAccess && (activeTab === 'tasks' || activeTab === 'overview')) {
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

  // ── Orders ────────────────────────────────────────────────────────────────
  const fetchShopOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/orders?limit=200', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const json = await res.json();
      setShopOrders(json.orders || []);
    } catch {
      // silently fall back to empty
    }
    setOrdersLoading(false);
  }, []);

  useEffect(() => {
    if (hasAccess && activeTab === 'orders') fetchShopOrders();
  }, [hasAccess, activeTab, fetchShopOrders]);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    setOrderActionLoading(orderId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      if (res.ok) {
        setShopOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        showToast(`Order status updated to ${newStatus}.`);
      } else {
        showToast('Failed to update order.', 'error');
      }
    } catch {
      showToast('Failed to update order.', 'error');
    }
    setOrderActionLoading(null);
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

  useEffect(() => {
    if (!hasAccess || activeTab !== 'platform') return;
    setPvLoading(true);
    supabase.from('platform_settings').select('value').eq('key', 'platform_version').maybeSingle().then(({ data }) => {
      const v = data?.value ?? null;
      setPvData(v);
      if (v) setPvForm({ version: v.version ?? '', label: v.label ?? 'Beta', date: v.date ?? '', notes: v.notes ?? '' });
      setPvLoading(false);
    });
  }, [hasAccess, activeTab]);

  const handleSavePlatformVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    setPvSaving(true);
    const { error } = await supabase.from('platform_settings').upsert(
      { key: 'platform_version', value: { ...pvForm }, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
    if (error) { showToast('Failed to save: ' + error.message, 'error'); }
    else {
      setPvData({ ...pvForm });
      showToast('Platform version updated!');
    }
    setPvSaving(false);
  };

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

  // Revoke a specific accepted application (applications tab)
  const handleRevokeApplication = async (appId: string, applicantId: string, intendedRole: string) => {
    const roleLabel = intendedRole === 'cofounder' ? 'co-founder' : 'co-member';
    if (!window.confirm(`Revoke this ${roleLabel}'s access? They will lose dashboard access but can re-apply.`)) return;
    setAppActionLoading(true);
    try {
      const { error } = await supabase.from('founder_applications').update({ status: 'removed' }).eq('id', appId);
      if (error) throw error;

      // Only clear profile role if they have no other accepted applications
      const { data: otherAccepted } = await supabase
        .from('founder_applications')
        .select('id')
        .eq('user_id', applicantId)
        .eq('status', 'accepted')
        .neq('id', appId);
      if (!otherAccepted?.length) {
        await supabase.from('profiles').update({ role: null }).eq('id', applicantId);
      }

      await supabase.from('notifications').insert({
        receiver_id: applicantId,
        actor_id: currentUserId,
        type: 'message',
        content: `Your ${roleLabel} access has been revoked. You're welcome to re-apply when ready.`,
      });

      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: 'removed' } : a));
      if (selectedApp?.id === appId) setSelectedApp((prev: any) => ({ ...prev, status: 'removed' }));
      showToast(`${roleLabel} access revoked.`);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setAppActionLoading(false);
    }
  };

  // Revoke all access for a user (users tab)
  const handleRevokeAccess = async (userId: string, username: string, currentRole: string) => {
    const roleLabel = currentRole === 'founder' ? 'co-founder' : 'co-member';
    if (!window.confirm(`Revoke ${roleLabel} access for @${username}? They will lose dashboard access but can re-apply.`)) return;
    setUserActionLoading(userId);
    try {
      await supabase.from('founder_applications').update({ status: 'removed' }).eq('user_id', userId).eq('status', 'accepted');
      await supabase.from('profiles').update({ role: null }).eq('id', userId);
      await supabase.from('notifications').insert({
        receiver_id: userId,
        actor_id: currentUserId,
        type: 'message',
        content: `Your ${roleLabel} access has been revoked. You're welcome to re-apply when ready.`,
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: null } : u));
      showToast(`${roleLabel} access revoked for @${username}.`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
    setUserActionLoading(null);
  };

  // Promote a co-member to co-founder access (admin only, no re-apply needed)
  const handlePromoteToFounder = async (
    userId: string,
    username: string,
    source: 'app' | 'user',
    appId?: string,
  ) => {
    if (!window.confirm(`Grant co-founder dashboard access to @${username}? They won't need to re-apply.`)) return;
    if (source === 'user') setUserActionLoading(userId); else setAppActionLoading(true);
    try {
      // Upsert a cofounder application marked accepted
      const { data: existing } = await supabase
        .from('founder_applications')
        .select('id')
        .eq('user_id', userId)
        .eq('intended_role', 'cofounder')
        .limit(1)
        .single();

      if (existing) {
        await supabase.from('founder_applications').update({ status: 'accepted' }).eq('id', existing.id);
      } else {
        await supabase.from('founder_applications').insert({
          user_id: userId,
          intended_role: 'cofounder',
          status: 'accepted',
          name: username,
          skills: 'Promoted by admin',
          experience: 'Promoted by admin',
          reason: { note: 'Directly promoted to co-founder by admin.' },
        });
      }

      await supabase.from('profiles').update({ role: 'founder' }).eq('id', userId);

      await supabase.from('notifications').insert({
        receiver_id: userId,
        actor_id: currentUserId,
        type: 'message',
        content: `You've been granted co-founder access! You can now use the Founder Workspace.`,
      });

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: 'founder' } : u));
      if (appId) setApplications(prev => prev.map(a => a.id === appId ? { ...a, promoted: true } : a));
      showToast(`@${username} promoted to co-founder.`);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      if (source === 'user') setUserActionLoading(null); else setAppActionLoading(false);
    }
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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const upcomingTasks = tasks
    .filter(t => t.due_date && new Date(t.due_date) > new Date() && t.status !== 'completed')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 3);

  const bentoTasksList = bentoTaskTab === 'upcoming'
    ? tasks.filter(t => t.status !== 'completed' && (!t.due_date || new Date(t.due_date) >= new Date())).slice(0, 5)
    : bentoTaskTab === 'overdue'
    ? tasks.filter(t => t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date()).slice(0, 5)
    : tasks.filter(t => t.status === 'completed').slice(0, 5);

  const taskProgress = (t: any) => t.status === 'completed' ? 100 : t.status === 'in_progress' ? 55 : 10;

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-zinc-950 p-4 sm:p-8 animate-in fade-in duration-500"
      style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.045) 1px, transparent 1px)', backgroundSize: '22px 22px' }}>
      {/* Password Gate Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl w-full max-w-sm p-7 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center">
                  <Lock size={18} className="text-amber-500" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-gray-900 dark:text-white">Protected Section</h2>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium capitalize">{pendingTab} · admin access only</p>
                </div>
              </div>
              <button onClick={() => setShowPasswordModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">Admin Password</label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  placeholder="Enter section password"
                  autoFocus
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 transition-all"
                />
                {passwordError && (
                  <p className="mt-2 text-[11px] text-red-500 font-bold flex items-center gap-1">
                    <AlertTriangle size={11} /> {passwordError}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={!passwordInput || passwordVerifying}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {passwordVerifying ? <Loader2 size={14} className="animate-spin" /> : <Unlock size={14} />}
                {passwordVerifying ? 'Verifying…' : 'Unlock'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.msg && (
        <div className={`fixed bottom-6 right-6 z-[500] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-sm ${toast.type === 'error' ? 'bg-white dark:bg-gray-900 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400' : 'bg-white dark:bg-gray-900 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400'}`}>
          {toast.type === 'error' ? <AlertTriangle size={15} className="shrink-0" /> : <Check size={15} className="shrink-0" />}
          <span className="text-xs font-bold">{toast.msg}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        {/* ── Premium Header ──────────────────────────────────────────────────── */}
        <header className="relative overflow-hidden bg-white dark:bg-zinc-900 rounded-[2rem] p-6 sm:p-8 border border-white dark:border-zinc-800 shadow-sm">
          {/* Decorative blobs */}
          <div className="absolute -top-16 -right-16 w-72 h-72 bg-gradient-to-br from-amber-200 via-orange-100 to-transparent rounded-full blur-3xl opacity-50 pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-56 h-56 bg-gradient-to-tr from-sky-100 to-transparent rounded-full blur-3xl opacity-40 pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-3xl overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 shadow-xl shadow-orange-200/50 dark:shadow-orange-900/30 flex-shrink-0 flex items-center justify-center text-2xl font-black text-white">
                {profile?.avatar_url
                  ? <Image src={profile.avatar_url} alt="avatar" fill sizes="80px" className="object-cover" />
                  : (profile?.username?.substring(0, 2).toUpperCase() || 'FD')}
              </div>
              <div>
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5">
                  <Crown size={11} /> {isAdmin ? 'Admin & Founder' : 'Co-Founder Workspace'}
                </p>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                  {greeting}, {profile?.username || 'Founder'} 👋
                </h1>
                <p className="text-gray-400 dark:text-zinc-500 mt-1 text-xs font-medium flex items-center gap-1.5">
                  <Calendar size={12} /> {currentDate}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link href="/member-dashboard"
                className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold transition-all text-xs border border-gray-100 dark:border-zinc-700">
                <Users size={13} /> Member View
              </Link>
              <Link href="/dash/feed"
                className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-2xl font-bold transition-all shadow-md text-xs">
                <Terminal size={13} /> Dashboard
              </Link>
              {isAdmin && (
                <Link href="/dash/more"
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-[#FFB020] hover:bg-amber-400 text-white rounded-2xl font-bold transition-all shadow-md shadow-amber-200 text-xs">
                  <Shield size={13} /> Admin Panel <ArrowRight size={12} />
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Tab Bar */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-0.5 p-1 rounded-2xl overflow-x-auto flex-1"
            style={{ background: 'white', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 14px rgba(0,0,0,0.05)' }}>
            {(() => {
              const META: Record<string, { color: string; grad: string; badge?: number }> = {
                overview:     { color: '#8b5cf6', grad: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' },
                applications: { color: '#f59e0b', grad: 'linear-gradient(135deg,#FFB020,#f97316)',
                                badge: applications.filter((a: any) => a.status === 'pending').length || 0 },
                users:        { color: '#3b82f6', grad: 'linear-gradient(135deg,#3b82f6,#2563eb)',
                                badge: allUsers.length || 0 },
                orders:       { color: '#10b981', grad: 'linear-gradient(135deg,#10b981,#059669)' },
                tasks:        { color: '#6366f1', grad: 'linear-gradient(135deg,#6366f1,#4f46e5)' },
                contracts:    { color: '#14b8a6', grad: 'linear-gradient(135deg,#14b8a6,#0d9488)',
                                badge: contractsList.length || 0 },
                platform:     { color: '#f43f5e', grad: 'linear-gradient(135deg,#f43f5e,#e11d48)' },
              };
              return TABS.map(tab => {
                const isActive = activeTab === tab.id;
                const isLocked = tab.protected && !protectedUnlocked;
                const m = META[tab.id] || { color: '#6b7280', grad: 'linear-gradient(135deg,#374151,#111827)' };
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    style={isActive ? { background: m.grad } : {}}
                    className={`relative flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[11px] font-black whitespace-nowrap transition-all duration-200 flex-1 justify-center
                      ${isActive ? 'text-white shadow-lg scale-[1.02]' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}
                  >
                    <tab.icon size={13} style={isActive ? { color: 'rgba(255,255,255,0.9)' } : { color: m.color }} />
                    <span>{tab.label}</span>
                    {(m.badge ?? 0) > 0 && (
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none ${
                        isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {m.badge}
                      </span>
                    )}
                    {isLocked && <Lock size={9} style={{ opacity: isActive ? 0.6 : 0.35 }} />}
                  </button>
                );
              });
            })()}
          </div>
          {protectedUnlocked && (
            <button
              onClick={handleLock}
              className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-amber-500 hover:border-amber-200 hover:bg-amber-50 transition-all shadow-sm shrink-0"
              title="Lock protected sections"
            >
              <Unlock size={15} />
            </button>
          )}
        </div>

        {/* ── OVERVIEW — Bento Grid ──────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-5">

            {/* ── Row 1 ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Widget A — Checklist */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Quick Tasks</p>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white mt-0.5">My Checklist</h3>
                  </div>
                  <button onClick={() => handleTabClick('tasks')} className="p-2 rounded-xl bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-400 hover:text-gray-700 transition-all">
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Add item */}
                <div className="flex gap-2 mb-5">
                  <input
                    value={newCheckItem}
                    onChange={e => setNewCheckItem(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newCheckItem.trim()) {
                        setChecklistItems(prev => [...prev, { id: Date.now(), text: newCheckItem.trim(), done: false }]);
                        setNewCheckItem('');
                      }
                    }}
                    placeholder="+ Add a task…"
                    className="flex-1 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-zinc-600 focus:outline-none focus:border-blue-300 transition-all"
                  />
                  <button
                    onClick={() => { if (newCheckItem.trim()) { setChecklistItems(prev => [...prev, { id: Date.now(), text: newCheckItem.trim(), done: false }]); setNewCheckItem(''); } }}
                    className="p-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-gray-700 dark:hover:bg-gray-200 transition-all"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Items */}
                <div className="space-y-2.5">
                  {checklistItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3 group">
                      <button
                        onClick={() => setChecklistItems(prev => prev.map(i => i.id === item.id ? { ...i, done: !i.done } : i))}
                        className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border-2 transition-all ${item.done ? 'bg-blue-600 border-blue-600 shadow-sm shadow-blue-200' : 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-blue-300'}`}
                      >
                        {item.done && <Check size={11} color="white" strokeWidth={3} />}
                      </button>
                      <span className={`flex-1 text-sm font-medium transition-all ${item.done ? 'line-through text-gray-300 dark:text-zinc-600' : 'text-gray-700 dark:text-gray-300'}`}>
                        {item.text}
                      </span>
                      <button
                        onClick={() => setChecklistItems(prev => prev.filter(i => i.id !== item.id))}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-400 transition-all"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-4 border-t border-gray-50 dark:border-zinc-800 flex items-center gap-3">
                  <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap">
                    {checklistItems.filter(i => i.done).length}/{checklistItems.length} done
                  </span>
                  <div className="flex-1 h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${checklistItems.length ? (checklistItems.filter(i => i.done).length / checklistItems.length) * 100 : 0}%` }} />
                  </div>
                  <span className="text-[11px] font-black text-blue-600 whitespace-nowrap">
                    {checklistItems.length ? Math.round(checklistItems.filter(i => i.done).length / checklistItems.length * 100) : 0}%
                  </span>
                </div>
              </div>

              {/* Widget B — Focus Timer */}
              <div className="bg-[#FFB020] rounded-3xl p-6 shadow-sm shadow-amber-200/60 hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-black text-amber-700/50 uppercase tracking-widest">Productivity</p>
                    <h3 className="text-lg font-black text-white mt-0.5">Focus Timer</h3>
                  </div>
                  <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Clock size={18} className="text-white" />
                  </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center py-6">
                  <div className="font-mono text-5xl font-black text-white tracking-tighter tabular-nums drop-shadow-sm">
                    {formatTimer(timerSeconds)}
                  </div>
                  <p className="text-amber-100/70 text-xs font-medium mt-2">
                    {timerRunning ? 'Session in progress…' : timerSeconds > 0 ? 'Session paused' : 'Ready to focus'}
                  </p>
                </div>

                <div className="flex gap-2.5 mt-2">
                  <button
                    onClick={() => setTimerRunning(r => !r)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/20 hover:bg-white/30 active:scale-95 text-white rounded-2xl font-bold text-sm transition-all"
                  >
                    {timerRunning ? <Pause size={16} /> : <Play size={16} />}
                    {timerRunning ? 'Pause' : 'Start'}
                  </button>
                  <button
                    onClick={() => { setTimerRunning(false); setTimerSeconds(0); }}
                    className="w-12 h-12 flex items-center justify-center bg-white/20 hover:bg-white/30 active:scale-95 text-white rounded-2xl transition-all"
                    title="Reset"
                  >
                    <Square size={16} />
                  </button>
                </div>
              </div>

              {/* Widget C — Activity Overview */}
              <div className="bg-[#121212] rounded-3xl p-6 shadow-sm hover:shadow-lg transition-shadow flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Statistics</p>
                    <h3 className="text-lg font-black text-white mt-0.5">Activity</h3>
                  </div>
                  <button onClick={() => fetchStats()} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white transition-all">
                    <RefreshCw size={13} />
                  </button>
                </div>

                <div className="flex items-center gap-4 flex-1">
                  <div className="flex-1 space-y-4">
                    {[
                      { label: 'Working hrs', value: `${Math.min(stats.completedTasks * 2, 40)}/40`, color: '#FFB020' },
                      { label: 'Tasks done',  value: `${stats.completedTasks}/${stats.totalTasks}`, color: '#00E5B0' },
                      { label: 'Team size',   value: `${stats.team}`,                               color: '#00A3FF' },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-0.5">{label}</p>
                        <p className="text-xl font-black tabular-nums" style={{ color }}>{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="relative flex-shrink-0">
                    <CircularProgress rings={[
                      { value: stats.completedTasks, max: stats.totalTasks || 1, color: '#FFB020', r: 63, sw: 10 },
                      { value: stats.team,           max: 20,                    color: '#00E5B0', r: 46, sw: 10 },
                      { value: stats.pendingApps === 0 ? 1 : 0, max: 1,         color: '#00A3FF', r: 29, sw: 10 },
                    ]} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-white font-black text-lg tabular-nums">{progress}%</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'Pending', value: stats.pendingApps, color: 'text-amber-400' },
                    { label: 'Members', value: stats.team,        color: 'text-teal-400'  },
                    { label: 'Tasks',   value: stats.totalTasks,  color: 'text-blue-400'  },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <p className={`text-lg font-black tabular-nums ${color}`}>{value}</p>
                      <p className="text-[9px] text-zinc-600 uppercase tracking-wider font-bold">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Row 2 ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Widget D — Upcoming Reminders */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Schedule</p>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white mt-0.5">Upcoming</h3>
                  </div>
                  <span className="text-[10px] font-black bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full">
                    {upcomingTasks.length} due
                  </span>
                </div>

                {upcomingTasks.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-8 text-gray-300 dark:text-zinc-700">
                    <CalendarDays size={28} className="mb-2" />
                    <p className="text-xs font-medium">No upcoming deadlines</p>
                  </div>
                ) : (
                  <div className="space-y-3 flex-1">
                    {upcomingTasks.map((t, idx) => {
                      const daysLeft = Math.ceil((new Date(t.due_date).getTime() - Date.now()) / 86400000);
                      const colors = ['bg-blue-500', 'bg-violet-500', 'bg-[#FFB020]'];
                      return (
                        <div key={t.id} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors">
                          <div className={`w-9 h-9 rounded-xl ${colors[idx % 3]} flex items-center justify-center text-white shrink-0`}>
                            <CalendarDays size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{t.title}</p>
                            <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                              {t.assignee?.username ? `@${t.assignee.username} · ` : ''}
                              {new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                          <span className={`text-[10px] font-black px-2 py-1 rounded-full shrink-0 ${daysLeft <= 1 ? 'bg-red-50 text-red-500 dark:bg-red-500/10' : daysLeft <= 3 ? 'bg-amber-50 text-amber-500 dark:bg-amber-500/10' : 'bg-blue-50 text-blue-500 dark:bg-blue-500/10'}`}>
                            {daysLeft === 0 ? 'Today' : daysLeft === 1 ? '1d' : `${daysLeft}d`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button onClick={() => handleTabClick('tasks')}
                  className="w-full mt-4 py-2.5 bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-200 text-white dark:text-gray-900 text-xs font-black rounded-2xl transition-all flex items-center justify-center gap-1.5">
                  View All Tasks <ChevronRight size={13} />
                </button>
              </div>

              {/* Widget E — Tasks I've Assigned */}
              <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Management</p>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white mt-0.5">Tasks I've Assigned</h3>
                  </div>
                  <button onClick={() => handleTabClick('tasks')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-200 text-white dark:text-gray-900 rounded-xl text-xs font-bold transition-all">
                    <Plus size={13} /> Assign Task
                  </button>
                </div>

                {/* Tab bar */}
                <div className="flex gap-1 p-1 bg-gray-50 dark:bg-zinc-800 rounded-2xl mb-5">
                  {(['upcoming', 'overdue', 'completed'] as const).map(tab => {
                    const overdueCt = tasks.filter(t => t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date()).length;
                    return (
                      <button key={tab} onClick={() => setBentoTaskTab(tab)}
                        className={`flex-1 py-2 rounded-xl text-[11px] font-black capitalize transition-all flex items-center justify-center gap-1 ${bentoTaskTab === tab ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                        {tab}
                        {tab === 'overdue' && overdueCt > 0 && (
                          <span className="bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black">{overdueCt}</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Task rows */}
                {tasksLoading ? (
                  <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-gray-200 dark:text-zinc-700" size={22} /></div>
                ) : bentoTasksList.length === 0 ? (
                  <div className="py-10 text-center text-gray-300 dark:text-zinc-700">
                    <ClipboardList size={28} className="mx-auto mb-2" />
                    <p className="text-xs font-medium">No {bentoTaskTab} tasks</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {bentoTasksList.map((t, idx) => {
                      const pct = taskProgress(t);
                      const pColor = t.priority === 'High' ? '#ef4444' : t.priority === 'Low' ? '#3b82f6' : '#f59e0b';
                      const trackColor = t.priority === 'High' ? '#fee2e2' : t.priority === 'Low' ? '#dbeafe' : '#fef3c7';
                      return (
                        <div key={t.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors group">
                          {/* Priority ID badge */}
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0"
                            style={{ backgroundColor: pColor }}>
                            {String(idx + 1).padStart(2, '0')}
                          </div>
                          {/* Title + progress */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{t.title}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: trackColor }}>
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: pColor }} />
                              </div>
                              <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 shrink-0">{pct}%</span>
                            </div>
                          </div>
                          {/* Assignee avatar */}
                          <div className="shrink-0">
                            {t.assignee?.avatar_url ? (
                              <div className="relative w-7 h-7 rounded-full border-2 border-white dark:border-zinc-900 overflow-hidden bg-gray-100">
                                <Image src={t.assignee.avatar_url} alt={t.assignee.username || ''} fill sizes="28px" className="object-cover" />
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-full border-2 border-white dark:border-zinc-900 bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-[9px] font-black">
                                {t.assignee?.username?.substring(0, 2).toUpperCase() || '??'}
                              </div>
                            )}
                          </div>
                          {/* Due date */}
                          {t.due_date && (
                            <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 shrink-0 hidden sm:block">
                              {new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── APPLICATIONS ──────────────────────────────────────────────────────── */}
        {activeTab === 'applications' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg,#FFB020,#f97316)' }}>
                  <Crown size={17} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#f59e0b' }}>Admin Panel</p>
                  <h2 className="text-xl font-black text-gray-900 leading-tight flex items-center gap-2">
                    Applications
                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">{applications.length}</span>
                    {applications.filter((a: any) => a.status === 'pending').length > 0 && (
                      <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full">
                        {applications.filter((a: any) => a.status === 'pending').length} pending
                      </span>
                    )}
                  </h2>
                </div>
              </div>
              <button onClick={fetchApplications} className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-amber-50 rounded-xl text-xs font-bold text-gray-500 hover:text-amber-600 border border-gray-200 hover:border-amber-200 transition-all shadow-sm">
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
                            {app.intended_role === 'cofounder' ? 'Co-Founder Application' : 'Co-Member Application'} · {getRelativeTime(app.created_at)}
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
                              onClick={() => handleApplicationAction(app.id, 'declined', app.user_id, app.intended_role)}
                              disabled={appActionLoading}
                              className="px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl text-xs font-bold border border-red-200 dark:border-red-500/20 transition-all disabled:opacity-50"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => handleApplicationAction(app.id, 'accepted', app.user_id, app.intended_role)}
                              disabled={appActionLoading}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 flex items-center gap-1"
                            >
                              {appActionLoading ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />}
                              Accept
                            </button>
                          </>
                        )}
                        {app.status === 'accepted' && (
                          <>
                            {app.intended_role === 'member' && !app.promoted && (
                              <button
                                onClick={() => handlePromoteToFounder(app.user_id, app.profiles?.username || 'user', 'app', app.id)}
                                disabled={appActionLoading}
                                className="px-3 py-1.5 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/20 rounded-xl text-xs font-bold border border-violet-200 dark:border-violet-500/20 transition-all disabled:opacity-50 flex items-center gap-1"
                              >
                                {appActionLoading ? <Loader2 size={12} className="animate-spin" /> : <Crown size={12} />}
                                Make Co-Founder
                              </button>
                            )}
                            <button
                              onClick={() => handleRevokeApplication(app.id, app.user_id, app.intended_role)}
                              disabled={appActionLoading}
                              className="px-3 py-1.5 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20 rounded-xl text-xs font-bold border border-orange-200 dark:border-orange-500/20 transition-all disabled:opacity-50 flex items-center gap-1"
                            >
                              {appActionLoading ? <Loader2 size={12} className="animate-spin" /> : <UserX size={12} />}
                              Revoke Access
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
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>
                  <Users size={17} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Admin Panel</p>
                  <h2 className="text-xl font-black text-gray-900 leading-tight flex items-center gap-2">
                    Platform Users
                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">{filteredUsers.length}</span>
                  </h2>
                </div>
              </div>
              <button onClick={fetchUsers} className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-blue-50 rounded-xl text-xs font-bold text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-200 transition-all shadow-sm">
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

                  const ringColor = suspended ? '#ef4444' : suspicious ? '#f59e0b' : user.is_verified ? '#10b981' : '#e2e8f0';
                  const initGrad = user.is_admin
                    ? 'linear-gradient(135deg,#FFB020,#f97316)'
                    : user.role === 'founder'
                      ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)'
                      : user.is_premium
                        ? 'linear-gradient(135deg,#3b82f6,#6366f1)'
                        : 'linear-gradient(135deg,#94a3b8,#64748b)';

                  return (
                    <div key={user.id} className="group bg-white rounded-2xl transition-all hover:shadow-md hover:-translate-y-px"
                      style={{ border: `1px solid ${suspended ? '#fecaca' : suspicious ? '#fde68a' : '#f1f5f9'}` }}>
                      {/* Card header row */}
                      <div className="flex items-center gap-3.5 p-4">

                        {/* Circular avatar with status ring */}
                        <div className="relative shrink-0">
                          <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-white text-sm font-black select-none"
                            style={{ background: user.avatar_url ? undefined : initGrad, outline: `2.5px solid ${ringColor}`, outlineOffset: '2px' }}>
                            {user.avatar_url
                              ? <Image src={user.avatar_url} alt="avatar" fill sizes="48px" className="object-cover" />
                              : user.username?.substring(0, 2).toUpperCase()}
                          </div>
                          {suspended && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border border-white">
                              <Ban size={8} className="text-white" />
                            </div>
                          )}
                          {!suspended && user.is_verified && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border border-white">
                              <span className="text-white text-[8px] font-black leading-none">✓</span>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <p className="text-sm font-black text-gray-900 truncate">@{user.username}</p>
                            {user.is_admin && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md text-white leading-none"
                                style={{ background: 'linear-gradient(135deg,#FFB020,#f97316)' }}>Admin</span>
                            )}
                            {user.role && user.role !== 'member' && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md text-white leading-none"
                                style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' }}>{user.role}</span>
                            )}
                            {user.is_premium && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none"
                                style={{ background: 'linear-gradient(135deg,#fef3c7,#fde68a)', color: '#92400e' }}>★ Premium</span>
                            )}
                            {suspended && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 leading-none border border-red-200">Suspended</span>
                            )}
                            {suspicious && !suspended && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 leading-none border border-amber-200">⚠ Suspicious</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            {user.email && <p className="text-[10px] text-gray-400 truncate flex items-center gap-1"><Mail size={9} />{user.email}</p>}
                            <p className="text-[10px] text-gray-400 flex items-center gap-1 shrink-0"><CalendarDays size={9} />{daysSince}d ago</p>
                          </div>
                        </div>

                        {/* Actions — subtle until hover */}
                        <div className="flex items-center gap-0.5 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => window.open(`/u/${user.username}`, '_blank')}
                            className="p-2 hover:bg-blue-50 text-gray-400 hover:text-blue-500 rounded-xl transition-all" title="View profile">
                            <ExternalLink size={13} />
                          </button>
                          <button onClick={() => { setActiveTab('contracts'); setTimeout(() => setShowContractModal(true), 50); setContractForm(prev => ({ ...prev, user_id: user.id })); }}
                            className="p-2 hover:bg-teal-50 text-gray-400 hover:text-teal-500 rounded-xl transition-all" title="Create contract">
                            <ScrollText size={13} />
                          </button>
                          <button onClick={() => { setActiveTab('tasks'); setTaskForm(prev => ({ ...prev, assignee_id: user.id })); setShowTaskModal(true); }}
                            className="p-2 hover:bg-indigo-50 text-gray-400 hover:text-indigo-500 rounded-xl transition-all" title="Assign task">
                            <ClipboardList size={13} />
                          </button>
                          {user.role === 'member' && (
                            <button
                              onClick={() => handlePromoteToFounder(user.id, user.username, 'user')}
                              disabled={isActioning || user.id === currentUserId}
                              className="p-2 hover:bg-violet-50 text-gray-400 hover:text-violet-500 rounded-xl transition-all disabled:opacity-40"
                              title="Promote to co-founder">
                              {isActioning ? <Loader2 size={13} className="animate-spin" /> : <Crown size={13} />}
                            </button>
                          )}
                          {(user.role === 'founder' || user.role === 'member') && (
                            <button
                              onClick={() => handleRevokeAccess(user.id, user.username, user.role)}
                              disabled={isActioning || user.id === currentUserId}
                              className="p-2 hover:bg-orange-50 text-gray-400 hover:text-orange-500 rounded-xl transition-all disabled:opacity-40"
                              title="Revoke team access">
                              {isActioning ? <Loader2 size={13} className="animate-spin" /> : <UserX size={13} />}
                            </button>
                          )}
                          <button
                            onClick={() => handleSuspendUser(user.id, !suspended)}
                            disabled={isActioning || user.id === currentUserId}
                            className={`p-2 rounded-xl transition-all disabled:opacity-40 ${suspended ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:bg-amber-50 hover:text-amber-500'}`}
                            title={suspended ? 'Reinstate user' : 'Suspend user'}>
                            {isActioning ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            disabled={isActioning || user.id === currentUserId}
                            className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-all disabled:opacity-40"
                            title="Delete user permanently">
                            <Trash2 size={13} />
                          </button>
                          <button onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                            className={`p-2 rounded-xl transition-all ${isExpanded ? 'bg-blue-50 text-blue-500' : 'text-gray-400 hover:bg-gray-100'}`}>
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

                          {/* Dashboard preview — only for team members */}
                          {(user.role === 'founder' || user.role === 'member') && (() => {
                            const dashUrl = user.role === 'founder' ? '/founder-dashboard' : '/member-dashboard';
                            const roleLabel = user.role === 'founder' ? 'Co-Founder' : 'Co-Member';
                            const preview = userDashPreviews[user.id];
                            return (
                              <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                                <div className="flex items-center justify-between mb-3">
                                  <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <BarChart3 size={11} /> {roleLabel} Dashboard
                                  </p>
                                  <div className="flex items-center gap-2">
                                    {!preview && (
                                      <button
                                        onClick={() => fetchUserDashPreview(user.id)}
                                        className="px-2.5 py-1 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold border border-blue-200 dark:border-blue-500/20 transition-all"
                                      >
                                        Load Preview
                                      </button>
                                    )}
                                    {preview && !preview.loading && (
                                      <button
                                        onClick={() => fetchUserDashPreview(user.id)}
                                        className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                        title="Refresh"
                                      >
                                        <RefreshCw size={11} />
                                      </button>
                                    )}
                                    <a
                                      href={dashUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2.5 py-1 bg-violet-50 dark:bg-violet-500/10 hover:bg-violet-100 dark:hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-lg text-[10px] font-bold border border-violet-200 dark:border-violet-500/20 transition-all flex items-center gap-1"
                                    >
                                      Open Dashboard <ExternalLink size={9} />
                                    </a>
                                  </div>
                                </div>

                                {preview?.loading && (
                                  <div className="py-4 flex justify-center">
                                    <Loader2 size={16} className="animate-spin text-blue-500" />
                                  </div>
                                )}

                                {preview && !preview.loading && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Tasks */}
                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <ClipboardList size={9} /> Tasks ({preview.tasks.length})
                                      </p>
                                      {preview.tasks.length === 0 ? (
                                        <p className="text-[11px] text-gray-400 dark:text-gray-500">No tasks assigned.</p>
                                      ) : (
                                        <div className="space-y-1.5">
                                          {preview.tasks.map(t => (
                                            <div key={t.id} className="flex items-start gap-2">
                                              <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                                                t.status === 'completed' ? 'bg-emerald-400' :
                                                t.status === 'in_progress' ? 'bg-blue-400' : 'bg-gray-300 dark:bg-gray-600'
                                              }`} />
                                              <div className="min-w-0">
                                                <p className={`text-[11px] font-bold truncate ${t.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300'}`}>{t.title}</p>
                                                <p className="text-[9px] text-gray-400 capitalize">{t.status?.replace('_', ' ')} · {t.priority}</p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* Notifications */}
                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <Activity size={9} /> Recent Activity ({preview.notifications.length})
                                      </p>
                                      {preview.notifications.length === 0 ? (
                                        <p className="text-[11px] text-gray-400 dark:text-gray-500">No recent activity.</p>
                                      ) : (
                                        <div className="space-y-1.5">
                                          {preview.notifications.map(n => (
                                            <div key={n.id} className="flex items-start gap-2">
                                              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                                              <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">{n.content}</p>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ORDERS ───────────────────────────────────────────────────────────── */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                  <Package size={17} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Admin Panel</p>
                  <h2 className="text-xl font-black text-gray-900 leading-tight flex items-center gap-2">
                    Shop Orders
                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">{shopOrders.length}</span>
                  </h2>
                </div>
              </div>
              <button onClick={fetchShopOrders} className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-emerald-50 rounded-xl text-xs font-bold text-gray-500 hover:text-emerald-600 border border-gray-200 hover:border-emerald-200 transition-all shadow-sm">
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            {/* Status filter */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl w-fit overflow-x-auto">
              {['all','processing','dispatched','out_delivery','delivered','cancelled'].map(s => (
                <button key={s} onClick={() => setOrderStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${orderStatusFilter === s ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
                  {s === 'all' ? 'All' : s === 'out_delivery' ? 'En Route' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {ordersLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-violet-500" size={24} /></div>
            ) : shopOrders.filter(o => orderStatusFilter === 'all' || o.status === orderStatusFilter).length === 0 ? (
              <div className="py-16 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                <Package size={40} className="mx-auto mb-4 opacity-20" />
                <p className="font-bold">No orders found</p>
                <p className="text-xs text-gray-400 mt-1">Orders will appear here once customers checkout from the shop.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shopOrders
                  .filter(o => orderStatusFilter === 'all' || o.status === orderStatusFilter)
                  .map(order => {
                    const isActioning = orderActionLoading === order.id;
                    const statusColors: Record<string, string> = {
                      processing:   'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
                      dispatched:   'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
                      out_delivery: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/20',
                      delivered:    'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
                      cancelled:    'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20',
                    };
                    const statusLabel: Record<string, string> = {
                      processing: 'Processing', dispatched: 'Dispatched', out_delivery: 'En Route',
                      delivered: 'Delivered', cancelled: 'Cancelled',
                    };
                    return (
                      <div key={order.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-all">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 rounded-xl flex items-center justify-center shrink-0">
                              <Package size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-black text-gray-900 dark:text-white font-mono">#{order.id?.slice(0, 8)}</p>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusColors[order.status] || statusColors.processing}`}>
                                  {statusLabel[order.status] || order.status}
                                </span>
                                {order.discreet && (
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">🔒 Discreet</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                {order.buyer?.username && (
                                  <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                                    <Users size={9} /> @{order.buyer.username}
                                  </p>
                                )}
                                {order.buyer?.email && (
                                  <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                    <Mail size={9} /> {order.buyer.email}
                                  </p>
                                )}
                                <p className="text-[10px] text-gray-400">
                                  {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            <p className="text-lg font-black text-gray-900 dark:text-white">${Number(order.total || 0).toFixed(2)}</p>
                            {/* Status update actions */}
                            {order.status === 'processing' && (
                              <button onClick={() => handleUpdateOrderStatus(order.id, 'dispatched')} disabled={isActioning}
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-xl text-[11px] font-bold border border-blue-200 dark:border-blue-500/20 transition-all disabled:opacity-50">
                                {isActioning ? <Loader2 size={10} className="animate-spin" /> : <Truck size={10} />} Dispatch
                              </button>
                            )}
                            {order.status === 'dispatched' && (
                              <button onClick={() => handleUpdateOrderStatus(order.id, 'out_delivery')} disabled={isActioning}
                                className="flex items-center gap-1 px-3 py-1.5 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 rounded-xl text-[11px] font-bold border border-violet-200 dark:border-violet-500/20 transition-all disabled:opacity-50">
                                {isActioning ? <Loader2 size={10} className="animate-spin" /> : <Truck size={10} />} Out for Delivery
                              </button>
                            )}
                            {order.status === 'out_delivery' && (
                              <button onClick={() => handleUpdateOrderStatus(order.id, 'delivered')} disabled={isActioning}
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-xl text-[11px] font-bold border border-emerald-200 dark:border-emerald-500/20 transition-all disabled:opacity-50">
                                {isActioning ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />} Mark Delivered
                              </button>
                            )}
                            {!['delivered','cancelled'].includes(order.status) && (
                              <button onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')} disabled={isActioning}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 rounded-xl text-[11px] font-bold border border-red-200 dark:border-red-500/20 transition-all disabled:opacity-50">
                                {isActioning ? <Loader2 size={10} className="animate-spin" /> : <XCircle size={10} />} Cancel
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Items */}
                        {order.items?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Items</p>
                            <div className="flex flex-wrap gap-2">
                              {order.items.map((item: any, i: number) => (
                                <span key={i} className="text-[11px] font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700">
                                  {item.name} ×{item.qty}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {order.address && (
                          <p className="mt-2 text-[11px] text-gray-400 flex items-center gap-1">
                            <span>📍</span> {order.address}
                          </p>
                        )}
                        {order.tracking && (
                          <p className="mt-1 text-[11px] text-gray-400 font-mono">
                            Tracking: {order.tracking}
                          </p>
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
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg,#14b8a6,#0d9488)' }}>
                  <ScrollText size={17} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-teal-500">Admin Panel</p>
                  <h2 className="text-xl font-black text-gray-900 leading-tight flex items-center gap-2">
                    Contracts
                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">{filteredContracts.length}</span>
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={fetchContracts} className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-teal-50 rounded-xl text-xs font-bold text-gray-500 hover:text-teal-600 border border-gray-200 hover:border-teal-200 transition-all shadow-sm">
                  <RefreshCw size={12} /> Refresh
                </button>
                <button
                  onClick={() => setShowContractModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  style={{ background: 'linear-gradient(135deg,#14b8a6,#0d9488)' }}
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
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                  <ClipboardList size={17} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Admin Panel</p>
                  <h2 className="text-xl font-black text-gray-900 leading-tight flex items-center gap-2">
                    All Tasks
                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">{filteredTasks.length}</span>
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={fetchTasks} className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-indigo-50 rounded-xl text-xs font-bold text-gray-500 hover:text-indigo-600 border border-gray-200 hover:border-indigo-200 transition-all shadow-sm">
                  <RefreshCw size={12} /> Refresh
                </button>
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm text-white"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}
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

        {/* ── PLATFORM ──────────────────────────────────────────────────────────── */}
        {activeTab === 'platform' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-500"><Zap size={18} /></div>
                <div>
                  <h2 className="text-lg font-black text-gray-900 dark:text-white">Platform Version</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">This version tag displays across the platform: docs, sidebar, and anywhere the version hook is used.</p>
                </div>
              </div>

              {pvLoading ? (
                <div className="flex items-center gap-3 py-8 justify-center text-gray-400"><Loader2 size={20} className="animate-spin" /> Loading…</div>
              ) : (
                <>
                  {pvData && (
                    <div className="flex flex-wrap gap-3 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Current</span>
                        <span className="text-sm font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 px-2.5 py-0.5 rounded-full">v{pvData.version}</span>
                        <Badge color="blue">{pvData.label}</Badge>
                      </div>
                      {pvData.date && <span className="text-[11px] text-gray-400 self-center">{pvData.date}</span>}
                    </div>
                  )}

                  <form onSubmit={handleSavePlatformVersion} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Version *</label>
                        <input
                          required
                          type="text"
                          placeholder="e.g. 2.1.0"
                          value={pvForm.version}
                          onChange={e => setPvForm({ ...pvForm, version: e.target.value })}
                          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-blue-500 transition-all text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Label</label>
                        <input
                          type="text"
                          placeholder="e.g. Beta, Stable, RC1, Custom…"
                          value={pvForm.label}
                          onChange={e => setPvForm({ ...pvForm, label: e.target.value })}
                          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Release Date</label>
                      <input
                        type="text"
                        placeholder="e.g. June 2026"
                        value={pvForm.date}
                        onChange={e => setPvForm({ ...pvForm, date: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Changelog / Release Notes</label>
                      <textarea
                        rows={4}
                        placeholder="What changed in this version…"
                        value={pvForm.notes}
                        onChange={e => setPvForm({ ...pvForm, notes: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all resize-none text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={pvSaving || !pvForm.version}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md disabled:opacity-50 text-sm"
                    >
                      {pvSaving ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                      {pvSaving ? 'Saving…' : 'Publish Version'}
                    </button>
                  </form>
                </>
              )}
            </div>

            {pvData?.notes && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 shadow-sm">
                <h3 className="text-sm font-black text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <BookOpen size={14} className="text-blue-500" /> Release Notes
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{pvData.notes}</p>
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
