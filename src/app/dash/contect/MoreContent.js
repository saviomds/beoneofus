"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Image from "next/image";
import { 
  Zap, 
  HelpCircle, 
  Code2, 
  Share2, 
  LogOut, 
  ChevronRight, 
  X, 
  Globe, 
  Cpu,
  Send,
  Copy,
  Check,
  Plus,
  Terminal,
  Activity,
  Database,
  Key,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  Search,
  Trash2,
  Bot,
  UserCog,
  FileText,
  ClipboardList
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import ProfileContent from "./ProfileContent";
import VerifiedBadge from "../../components/VerifiedBadge";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

// --- TOOL COMPONENTS ---

const SystemStatusTool = () => {
  const [ping, setPing] = useState(0);
  const [history, setHistory] = useState(Array(30).fill(0));
  const [status, setStatus] = useState('Operational');

  useEffect(() => {
    let isMounted = true;
    const checkPing = async () => {
      const start = Date.now();
      try {
        await supabase.from('profiles').select('id').limit(1);
        const duration = Date.now() - start;
        if (isMounted) {
          setPing(duration);
          setHistory(prev => [...prev.slice(1), duration]);
          setStatus(duration > 800 ? 'Degraded' : 'Operational');
        }
      } catch(e) {
        if (isMounted) {
          setStatus('Outage');
          setPing(0);
          setHistory(prev => [...prev.slice(1), 0]);
        }
      }
    };
    checkPing();
    const interval = setInterval(checkPing, 2000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={18} className="text-gray-500 dark:text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest">Network Latency</p>
            </div>
            <div className="flex items-end gap-2">
               <span className="text-5xl font-black text-gray-900 dark:text-gray-100 tracking-tighter">{ping}</span>
               <span className="text-gray-500 dark:text-gray-400 mb-1 font-bold">ms</span>
            </div>
         </div>
         <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Database size={18} className="text-gray-500 dark:text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest">Platform Health</p>
            </div>
            <div className="flex items-center gap-3 mt-2">
               <div className={`w-4 h-4 rounded-full shadow-lg ${status === 'Operational' ? 'bg-green-500 shadow-green-500/50 animate-pulse' : 'bg-red-500 shadow-red-500/50'}`} />
               <span className={`text-2xl font-black tracking-tight ${status === 'Operational' ? 'text-green-400' : 'text-red-400'}`}>{status}</span>
            </div>
         </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest mb-6">Real-Time Packet Monitor</p>
        <div className="h-40 flex items-end gap-1.5 w-full">
          {history.map((val, i) => {
            const height = Math.min(100, Math.max(2, (val / 500) * 100));
            return (
              <div 
                key={i} 
                className="flex-1 bg-blue-500 hover:bg-blue-400 transition-all rounded-t-sm opacity-80 hover:opacity-100" 
                style={{ height: `${height}%` }} 
                title={`${val}ms`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

const ApiAccessTool = () => {
  const [keys, setKeys] = useState([
    { id: 1, name: 'Production Key', key: 'sk_live_9a8b7c6d5e4f3a2b1c0d', created: '2023-11-20' },
    { id: 2, name: 'Development Key', key: 'sk_test_1b2c3d4e5f6a7b8c9d0e', created: '2024-01-15' }
  ]);
  const [copied, setCopied] = useState(null);

  const handleCopy = (key) => {
    navigator.clipboard.writeText(key);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const generateKey = () => {
    const isLive = Math.random() > 0.5;
    const prefix = isLive ? 'sk_live_' : 'sk_test_';
    const newKey = prefix + Array.from({length: 24}, () => Math.random().toString(36).charAt(2)).join('');
    setKeys([{ id: Date.now(), name: 'New API Key', key: newKey, created: new Date().toISOString().split('T')[0] }, ...keys]);
  };

  const deleteKey = (id) => setKeys(keys.filter(k => k.id !== id));

  return (
    <div className="space-y-8 max-w-3xl mx-auto py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-gray-900 dark:text-gray-100 font-bold text-lg">Active Secret Keys</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Do not share your API keys in publicly accessible areas.</p>
        </div>
        <button onClick={generateKey} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 shrink-0">
          <Plus size={16} /> Create New Key
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
        {keys.length === 0 ? (
           <div className="p-10 text-center text-gray-500 dark:text-gray-400 text-sm">No API keys found. Generate one to get started.</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {keys.map(k => (
              <div key={k.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all gap-4">
                <div>
                  <h4 className="text-gray-900 dark:text-gray-100 font-bold text-sm flex items-center gap-2 mb-1">
                    <Key size={14} className={k.key.startsWith('sk_live') ? 'text-green-500' : 'text-amber-500'} /> 
                    {k.name}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300 font-mono tracking-wider bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded inline-block border border-gray-200 dark:border-gray-700">{k.key.substring(0, 12)}••••••••••••••••</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-600 dark:text-gray-400 font-bold uppercase tracking-widest hidden sm:block mr-2">{k.created}</span>
                  <button onClick={() => handleCopy(k.key)} className="p-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-all border border-gray-200 dark:border-gray-700" title="Copy Key">
                    {copied === k.key ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                  <button onClick={() => deleteKey(k.id)} className="p-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all border border-gray-200 dark:border-gray-700" title="Revoke Key">
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const CommunityHubTool = ({ currentUserId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);
  const [error, setError] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('community_messages')
        .select('*, profiles:user_id(username, avatar_url, is_verified)')
        .order('created_at', { ascending: true })
        .limit(50);
      if (error) {
        setError(true);
      } else if (data) {
        setMessages(data);
      }
    };
    fetchMessages();

    const channel = supabase.channel('public:community_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages' }, (payload) => {
         const fetchNew = async () => {
            const { data } = await supabase.from('community_messages').select('*, profiles:user_id(username, avatar_url, is_verified)').eq('id', payload.new.id).single();
            if (data) setMessages(prev => {
              if (prev.find(m => m.id === data.id)) return prev;
              return [...prev, data];
            });
         };
         fetchNew();
      }).subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !currentUserId) return;
    const text = input;
    setInput("");
    
    // Optimistic update for fast UI
    const tempId = Date.now();
    setMessages(prev => [...prev, { id: tempId, user_id: currentUserId, text, profiles: { username: 'Sending...' } }]);
    
    await supabase.from('community_messages').insert({ user_id: currentUserId, text });
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 text-center p-10">
        <AlertCircle size={48} className="text-red-500/50 mb-2" />
        <div>
          <p className="text-red-400 font-bold mb-2 text-lg">Community Hub Not Initialized</p>
          <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
            The <code className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded mx-1">community_messages</code> table does not exist in your database. 
            Please run the setup SQL provided by your assistant to enable real-time global chat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] overflow-hidden max-w-4xl mx-auto shadow-lg">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
             <Globe size={48} className="mb-4 opacity-30 text-blue-500" />
             <p className="font-bold text-sm uppercase tracking-widest mb-1">Global Chat Initialized</p>
             <p className="text-xs font-mono">Say hello to the network.</p>
          </div>
        ) : (
          messages.map(msg => (
         <div key={msg.id} className={`flex gap-2 ${msg.user_id === currentUserId ? 'justify-end' : 'justify-start'}`}>
           {msg.user_id !== currentUserId && (
             <div 
               onClick={() => setSelectedUserId(msg.user_id)}
               className="relative w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs uppercase shrink-0 mt-auto cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors overflow-hidden"
               title={`View @${msg.profiles?.username}'s Profile`}
             >
               {msg.profiles?.avatar_url ? (
                 <Image src={msg.profiles.avatar_url} alt="avatar" fill sizes="32px" className="object-cover" />
               ) : (
                 msg.profiles?.username?.substring(0, 2) || "??"
               )}
             </div>
           )}
           <div className={`flex flex-col ${msg.user_id === currentUserId ? 'items-end' : 'items-start'} max-w-[85%]`}>
             {msg.user_id !== currentUserId && <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-1 pl-1 flex items-center gap-1">
               @{msg.profiles?.username}
               {msg.profiles?.is_verified && <VerifiedBadge size={10} />}
             </span>}
               <div className={`w-full px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${msg.user_id === currentUserId ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-tl-none'}`}>
               {msg.text}
             </div>
           </div>
         </div>
          ))
        )}
      </div>

      {/* USER PROFILE MODAL */}
      {selectedUserId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setSelectedUserId(null)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar z-10 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-xl">
            <button 
              onClick={() => setSelectedUserId(null)} 
              className="absolute top-6 right-6 z-[250] p-2 bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-full text-gray-500 dark:text-gray-400 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="p-2 sm:p-6">
              <ProfileContent viewUserId={selectedUserId} />
            </div>
          </div>
        </div>
      )}
      <form onSubmit={handleSend} className="p-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800 flex gap-2 shrink-0">
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder="Broadcast to community..." 
          className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
        />
        <button type="submit" disabled={!input.trim()} className="px-5 bg-blue-600 text-white hover:bg-blue-700 rounded-2xl font-black disabled:opacity-50 transition-all">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

const AdminPanelTool = ({ currentUserId }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState('requests'); // 'requests' | 'users' | 'ai_logs'
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [aiLogs, setAiLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [applications, setApplications] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const [founderApps, setFounderApps] = useState([]);
  const [founderAppsLoading, setFounderAppsLoading] = useState(false);
  const [selectedFounderApp, setSelectedFounderApp] = useState(null);

  const [adminTasks, setAdminTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ assignee_id: '', title: '', description: '', priority: 'Medium', linked_to: '' });
  const [taskFilter, setTaskFilter] = useState('All');
  const [teamMembers, setTeamMembers] = useState([]);

  const [actionPrompt, setActionPrompt] = useState(null);
  const [customMessage, setCustomMessage] = useState("");
  const [actionProcessing, setActionProcessing] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "success" }), 3000);
  };

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      if (!currentUserId) return;
      
      // Check admin status
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', currentUserId)
        .single();

      if (!profile?.is_admin) {
        setLoading(false);
        return;
      }
      setIsAdmin(true);

      // Fetch pending requests
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, status')
        .eq('verification_status', 'pending');
        
      if (error) console.error("Error fetching requests:", error);
      if (data) setRequests(data);
      setLoading(false);
    };

    checkAdminAndFetch();
  }, [currentUserId]);

  // Fetch all users when the 'Users' or 'Tasks' tab is opened
  useEffect(() => {
    if ((adminTab === 'users' || adminTab === 'tasks') && isAdmin && allUsers.length === 0) {
      const fetchAllUsers = async () => {
        setUsersLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, status, is_verified, is_admin')
          .limit(100);
        if (error) console.error("Error fetching users:", error);
        if (data) setAllUsers(data);
        setUsersLoading(false);
      };
      fetchAllUsers();
    }
  }, [adminTab, isAdmin, allUsers.length]);

  // Fetch AI Logs when the 'AI Logs' tab is opened
  useEffect(() => {
    if (adminTab === 'ai_logs' && isAdmin && aiLogs.length === 0) {
      const fetchLogs = async () => {
        setLogsLoading(true);
        const { data, error } = await supabase
          .from('ai_chat_messages')
          .select('role, content, created_at, user_id')
          .order('created_at', { ascending: false })
          .limit(100);
          
        if (error) {
          console.error("Error fetching AI logs:", error.message || error);
        } else if (data) {
          const userIds = [...new Set(data.map(log => log.user_id).filter(Boolean))];
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, is_verified')
            .in('id', userIds);
            
          const profileMap = (profileData || []).reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {});
          
          const logsWithProfiles = data.map(log => ({
            ...log,
            profiles: profileMap[log.user_id] || null
          }));
          
          setAiLogs(logsWithProfiles);
        }
        setLogsLoading(false);
      };
      fetchLogs();
    }
  }, [adminTab, isAdmin, aiLogs.length]);

  // Fetch Applications when the 'Applications' tab is opened
  useEffect(() => {
    if (adminTab === 'applications' && isAdmin && applications.length === 0) {
      const fetchApps = async () => {
        setAppsLoading(true);
        const { data, error } = await supabase
          .from('job_applications')
          .select('*, jobs(id, title, company), profiles(username, avatar_url, is_verified, github, website, location, status, work_status)')
          .order('created_at', { ascending: false })
          .limit(200);
          
        if (error) {
          console.error("Error fetching applications:", error);
        } else if (data) {
          const uniqueApps = data.reduce((acc, current) => {
            const isDuplicate = acc.find(item => item.user_id === current.user_id && item.job_id === current.job_id);
            if (!isDuplicate) {
              return acc.concat([current]);
            }
            return acc;
          }, []);
          setApplications(uniqueApps);
        }
        setAppsLoading(false);
      };
      fetchApps();
    }
  }, [adminTab, isAdmin, applications.length]);

  // Fetch Founder Apps when the 'Founder Apps' tab is opened
  useEffect(() => {
    if (adminTab === 'founder_apps' && isAdmin && founderApps.length === 0) {
      const fetchFounderApps = async () => {
        setFounderAppsLoading(true);
        const { data, error } = await supabase
          .from('founder_applications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);
          
        if (error) {
          console.error("Error fetching founder applications:", error);
        } else if (data) {
          setFounderApps(data);
        }
        setFounderAppsLoading(false);
      };
      fetchFounderApps();
    }
  }, [adminTab, isAdmin, founderApps.length]);

  // Fetch Tasks when the 'Tasks' tab is opened
  useEffect(() => {
    let channel;
    if (adminTab === 'tasks' && isAdmin) {
      const fetchTasks = async () => {
        setTasksLoading(true);
        const { data, error } = await supabase
          .from('tasks')
          .select(`
            *,
            assignee:profiles!tasks_assignee_id_fkey(username, avatar_url, status),
            assigner:profiles!tasks_assigner_id_fkey(username, avatar_url, status)
          `)
          .order('created_at', { ascending: false });
        if (data) setAdminTasks(data);
        setTasksLoading(false);
      };

      const fetchTeamMembers = async () => {
        const { data } = await supabase
          .from('founder_applications')
          .select('user_id, intended_role, name')
          .eq('status', 'accepted');
        if (data) {
          const uniqueMembers = data.reduce((acc, current) => {
            if (!acc.find(item => item.user_id === current.user_id)) {
              return acc.concat([current]);
            }
            return acc;
          }, []);
          setTeamMembers(uniqueMembers);
        }
      };

      fetchTasks();
      fetchTeamMembers();

      // Listen for real-time updates so newly created issues show instantly
      channel = supabase.channel('admin-tasks-all')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
          fetchTasks();
        })
        .subscribe();
    }
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [adminTab, isAdmin]);

  const handleAction = async (userId, action) => {
    try {
      const updates = action === 'approve' 
        ? { is_verified: true, verification_status: 'verified' }
        : { is_verified: false, verification_status: 'unverified' };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      // Remove from list
      setRequests(prev => prev.filter(req => req.id !== userId));
      
      // Send a notification to the user
      await supabase.from('notifications').insert({
        receiver_id: userId,
        actor_id: currentUserId,
        type: action === 'approve' ? 'handshake' : 'blocked',
        content: action === 'approve' ? 'approved your verification request!' : 'denied your verification request.'
      });
      showToast(`User verification ${action === 'approve' ? 'approved' : 'denied'}.`);

    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`Are you sure you want to permanently delete @${username}?`)) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      setAllUsers(prev => prev.filter(u => u.id !== userId));
      showToast(`User @${username} has been deleted.`);
    } catch (err) {
      showToast("Error deleting user: " + err.message, "error");
    }
  };

  const handleToggleAdmin = async (userId, currentIsAdmin, username) => {
    if (!confirm(`Are you sure you want to ${currentIsAdmin ? 'revoke' : 'grant'} admin access for @${username}?`)) return;
    try {
      const { error } = await supabase.from('profiles').update({ is_admin: !currentIsAdmin }).eq('id', userId);
      if (error) throw error;
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: !currentIsAdmin } : u));
      showToast(`Admin access ${currentIsAdmin ? 'revoked' : 'granted'} for @${username}.`);
    } catch (err) {
      showToast("Error updating admin status: " + err.message, "error");
    }
  };

  const handleImpersonateUser = async (userId, username) => {
    if (!confirm(`Are you sure you want to impersonate @${username}? You will be logged out of your admin account.`)) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('impersonate', {
        body: { userId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.action_link) {
        showToast(`Success! Logging in as @${username}...`);
        window.location.href = data.action_link;
      } else {
        throw new Error("No action link returned.");
      }
    } catch (err) {
      showToast("Error impersonating: " + err.message, "error");
    }
  };

  const promptAppAction = (appId, newStatus, applicantId, jobTitle) => {
    setActionPrompt({ type: 'job', appId, newStatus, applicantId, title: jobTitle });
    setCustomMessage("");
  };

  const promptFounderAppAction = (appId, newStatus, applicantId, role) => {
    setActionPrompt({ type: 'founder', appId, newStatus, applicantId, title: role });
    setCustomMessage("");
  };

  const submitActionPrompt = async () => {
    setActionProcessing(true);
    if (actionPrompt.type === 'job') {
      await handleAppAction(actionPrompt.appId, actionPrompt.newStatus, actionPrompt.applicantId, actionPrompt.title, customMessage);
    } else {
      await handleFounderAppAction(actionPrompt.appId, actionPrompt.newStatus, actionPrompt.applicantId, actionPrompt.title, customMessage);
    }
    setActionProcessing(false);
    setActionPrompt(null);
  };

  const handleAppAction = async (appId, newStatus, applicantId, jobTitle, customMessage) => {
    try {
      const { error } = await supabase
        .from('job_applications')
        .update({ status: newStatus })
        .eq('id', appId);

      if (error) throw error;

      // Send a notification to the applicant!
      if (applicantId) {
        let notifContent = `Your job application for ${jobTitle || 'a recent role'} was ${newStatus}.`;
        if (customMessage) notifContent += ` Note: "${customMessage}"`;

        await supabase.from('notifications').insert({
          receiver_id: applicantId,
          actor_id: currentUserId,
          type: 'message',
          content: notifContent
        });

        // Trigger email notification
        const emailRes = await fetch('/api/send-app-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applicationId: appId,
            applicantId,
            status: newStatus,
            jobTitle: jobTitle || 'a recent role',
            customMessage
          })
        });

        if (!emailRes.ok) {
          const contentType = emailRes.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errData = await emailRes.json();
            throw new Error(errData.error || 'Failed to send email notification.');
          } else {
            throw new Error('API Route not found or server crashed. Ensure API keys are set.');
          }
        }
      }

      setApplications(prev => prev.map(app => 
        app.id === appId ? { ...app, status: newStatus } : app
      ));
      if (selectedApp && selectedApp.id === appId) {
        setSelectedApp(prev => ({...prev, status: newStatus}));
      }
      showToast(`Application ${newStatus} successfully!`);
    } catch (err) {
      showToast("Error updating application: " + err.message, "error");
    }
  };

  const handleDeleteApp = async (appId) => {
    if(!confirm("Are you sure you want to permanently delete this application?")) return;
    try {
      const { error } = await supabase.from('job_applications').delete().eq('id', appId);
      if (error) throw error;
      setApplications(prev => prev.filter(app => app.id !== appId));
      setSelectedApp(null);
      showToast("Application deleted successfully.");
    } catch (err) {
      showToast("Error deleting application: " + err.message, "error");
    }
  };

  const handleDeleteFounderApp = async (appId) => {
    if(!confirm("Are you sure you want to permanently delete this application?")) return;
    try {
      const { error } = await supabase.from('founder_applications').delete().eq('id', appId);
      if (error) throw error;
      setFounderApps(prev => prev.filter(app => app.id !== appId));
      setSelectedFounderApp(null);
      showToast("Application deleted successfully.");
    } catch (err) {
      showToast("Error deleting application: " + err.message, "error");
    }
  };

  const handleFounderAppAction = async (appId, newStatus, applicantId, role, customMessage) => {
    try {
      const { error } = await supabase
        .from('founder_applications')
        .update({ status: newStatus })
        .eq('id', appId);

      if (error) throw error;

      if (applicantId) {
        const dashboardLink = newStatus === 'accepted' 
          ? (role === 'cofounder' ? '/founder-dashboard' : '/member-dashboard') 
          : null;
          
        let notifContent = `Your application to join as a ${role} was ${newStatus}.`;
        if (newStatus === 'accepted') notifContent += ` Welcome aboard!`;
        if (customMessage) notifContent += ` Note: "${customMessage}"`;
        
        await supabase.from('notifications').insert({
          receiver_id: applicantId,
          actor_id: currentUserId,
          type: 'message',
          content: notifContent,
          link: dashboardLink
        });

        // Fetch to send an email
        const emailRes = await fetch('/api/notify-applicant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applicationId: appId, applicantId, status: newStatus, role, customMessage, dashboardLink })
        });

        if (!emailRes.ok) {
          const contentType = emailRes.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errData = await emailRes.json();
            throw new Error(errData.error || 'Failed to send email notification.');
          } else {
            throw new Error('API Route not found or server crashed. Ensure API keys are set.');
          }
        }
      }

      setFounderApps(prev => prev.map(app => app.id === appId ? { ...app, status: newStatus } : app));
      if (selectedFounderApp && selectedFounderApp.id === appId) {
        setSelectedFounderApp(prev => ({...prev, status: newStatus}));
      }
      showToast(`Application ${newStatus} successfully!`);
    } catch (err) {
      showToast("Error updating application: " + err.message, "error");
    }
  };

  const handleComplexUpdate = async (taskId, newStatus) => {
    setActionProcessing(true);
    try {
      const { error } = await supabase.rpc('update_task_complex', {
        p_task_id: taskId,
        p_new_status: newStatus
      });

      if (error) {
        console.error("Failed complex update. Details:");
        console.error("- Message:", error?.message);
        console.error("- Code:", error?.code);
        console.error("- Details:", error?.details);
        console.error("- Hint:", error?.hint);
        showToast("Failed to update task: " + (error?.message || "Unknown error"), "error");
      } else {
        console.log("Task and notifications updated successfully via RPC!");
        setAdminTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        showToast("Task updated successfully!");
      }
    } catch (err) {
      showToast("Error updating task: " + err.message, "error");
    } finally {
      setActionProcessing(false);
    }
  };

  const handleAssignTask = async (e) => {
    e.preventDefault();
    setActionProcessing(true);
    try {
      const { data, error } = await supabase.from('tasks').insert({
        assignee_id: taskForm.assignee_id,
        assigner_id: currentUserId,
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        linked_to: taskForm.linked_to,
        status: 'pending'
      }).select(`
        *,
        assignee:profiles!tasks_assignee_id_fkey(username, avatar_url, status),
        assigner:profiles!tasks_assigner_id_fkey(username, avatar_url, status)
      `).single();
      
      if (error) throw error;

      setAdminTasks(prev => [data, ...prev]);

      await supabase.from('notifications').insert({
        receiver_id: taskForm.assignee_id,
        actor_id: currentUserId,
        type: 'message',
        content: `assigned you a new task: ${taskForm.title}`
      });

      setShowTaskModal(false);
      setTaskForm({ assignee_id: '', title: '', description: '', priority: 'Medium', linked_to: '' });
      showToast("Task assigned successfully!");
    } catch (err) {
      showToast("Error assigning task: " + err.message, "error");
    } finally {
      setActionProcessing(false);
    }
  };

  const getReasonObj = (reasonData) => {
    if (!reasonData) return {};
    if (typeof reasonData === 'string') {
      try { return JSON.parse(reasonData); } catch (e) { return { 'Responses': reasonData }; }
    }
    return reasonData;
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  if (!isAdmin) return (
    <div className="flex flex-col items-center justify-center h-full space-y-4 text-center p-10">
      <ShieldAlert size={48} className="text-red-500/50 mb-2" />
      <div>
        <p className="text-red-400 font-bold mb-2 text-lg">Unauthorized Access</p>
        <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
          Your node does not have the required security clearance (Admin) to view this terminal.
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto py-4">
      {/* Header + Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-[2rem]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-blue-200 dark:border-blue-800/50">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 className="text-blue-700 dark:text-blue-400 font-bold text-lg mb-1">Admin Dashboard</h3>
            <p className="text-sm text-blue-600/80 dark:text-blue-400/80 leading-relaxed">Manage the platform and verify nodes.</p>
          </div>
        </div>
        <div className="flex bg-white dark:bg-gray-900 p-1 rounded-xl border border-blue-200 dark:border-blue-800/50 shadow-sm shrink-0 overflow-x-auto">
          <button onClick={() => setAdminTab('requests')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${adminTab === 'requests' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>Requests</button>
          <button onClick={() => setAdminTab('users')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${adminTab === 'users' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>Users</button>
          <button onClick={() => setAdminTab('ai_logs')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${adminTab === 'ai_logs' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>AI Logs</button>
          <button onClick={() => setAdminTab('applications')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${adminTab === 'applications' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>Applications</button>
          <button onClick={() => setAdminTab('founder_apps')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${adminTab === 'founder_apps' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>Founder Apps</button>
          <button onClick={() => setAdminTab('tasks')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${adminTab === 'tasks' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>Tasks</button>
        </div>
      </div>

      {/* Requests Tab */}
      {adminTab === 'requests' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] overflow-hidden shadow-sm">
        {requests.length === 0 ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400 text-sm font-medium">No pending verification requests.</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {requests.map(req => (
              <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all gap-4">
                <div className="flex items-center gap-4">
                    <div 
                      onClick={() => setSelectedUserId(req.id)}
                      className="relative w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700 flex items-center justify-center font-bold text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:opacity-80 transition-opacity"
                    >
                    {req.avatar_url ? (
                      <Image src={req.avatar_url} alt="avatar" fill sizes="48px" className="object-cover" />
                    ) : (
                      req.username?.substring(0, 2) || "??"
                    )}
                  </div>
                  <div className="cursor-pointer group" onClick={() => setSelectedUserId(req.id)}>
                    <h4 className="text-gray-900 dark:text-gray-100 font-bold text-sm group-hover:text-blue-600 transition-colors">@{req.username}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 group-hover:text-blue-500/80 transition-colors">{req.status || 'Active Node'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleAction(req.id, 'reject')} className="px-5 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl font-bold text-xs transition-colors border border-red-200 dark:border-red-800/50">
                    Deny
                  </button>
                  <button onClick={() => handleAction(req.id, 'approve')} className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold text-xs transition-colors shadow-sm">
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      )}

      {/* Manage Users Tab */}
      {adminTab === 'users' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
              <input 
                type="text" 
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users by username..." 
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 pl-10 pr-10 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {userSearch && (
                <button onClick={() => setUserSearch('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          
          {usersLoading ? (
            <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
          ) : allUsers.length === 0 ? (
            <div className="p-10 text-center text-gray-500 dark:text-gray-400 text-sm font-medium">No users found.</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[500px] overflow-y-auto custom-scrollbar">
              {allUsers.filter(u => u.username.toLowerCase().includes(userSearch.toLowerCase())).map(user => (
                <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      onClick={() => setSelectedUserId(user.id)}
                      className="relative w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700 flex items-center justify-center font-bold text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      {user.avatar_url ? <Image src={user.avatar_url} alt="avatar" fill sizes="40px" className="object-cover" /> : user.username?.substring(0, 2) || "??"}
                    </div>
                    <div className="min-w-0 cursor-pointer group" onClick={() => setSelectedUserId(user.id)}>
                      <h4 className="text-gray-900 dark:text-gray-100 font-bold text-sm flex items-center gap-1 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        @{user.username}
                        {user.is_verified && <VerifiedBadge size={14} />}
                        {user.is_admin && <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 px-1.5 py-0.5 rounded uppercase tracking-widest ml-1">Admin</span>}
                      </h4>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-0.5 truncate group-hover:text-blue-500/80 transition-colors">{user.status || 'Active Node'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleToggleAdmin(user.id, user.is_admin, user.username)} className={`p-2 rounded-xl transition-colors border ${user.is_admin ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-600 hover:text-white border-amber-200 dark:border-amber-800/50 hover:border-amber-600' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-amber-500 hover:text-white border-gray-200 dark:border-gray-700 hover:border-amber-500'}`} title={user.is_admin ? "Revoke Admin Access" : "Grant Admin Access"}>
                      <ShieldCheck size={16} />
                    </button>
                    <button onClick={() => handleImpersonateUser(user.id, user.username)} className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-600 dark:hover:bg-purple-500 hover:text-white rounded-xl transition-colors border border-purple-200 dark:border-purple-800/50 hover:border-purple-600 dark:hover:border-purple-500" title="Impersonate User"><UserCog size={16} /></button>
                    <button onClick={() => handleDeleteUser(user.id, user.username)} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-600 dark:hover:bg-red-500 hover:text-white rounded-xl transition-colors border border-red-200 dark:border-red-800/50 hover:border-red-600 dark:hover:border-red-500" title="Delete User"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Logs Tab */}
      {adminTab === 'ai_logs' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
            <h4 className="text-gray-900 dark:text-gray-100 font-bold text-sm pl-2">Recent AI Interactions</h4>
            <button onClick={() => setAiLogs([])} className="text-xs text-blue-600 font-bold hover:underline px-2 transition-all">Refresh</button>
          </div>
          
          {logsLoading ? (
            <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
          ) : aiLogs.length === 0 ? (
            <div className="p-10 text-center text-gray-500 dark:text-gray-400 text-sm font-medium">No AI logs found.</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[500px] overflow-y-auto custom-scrollbar">
              {aiLogs.map((log, index) => (
                <div key={log.id || index} className="flex flex-col sm:flex-row p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all gap-4">
                  {/* Avatar & User Info */}
                  <div className="flex items-center sm:items-start sm:w-48 shrink-0 gap-3">
                    {log.role === 'assistant' ? (
                      <div className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 text-white flex items-center justify-center shrink-0">
                        <Bot size={20} />
                      </div>
                    ) : (
                      <div className="relative w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700 flex items-center justify-center font-bold text-gray-500 dark:text-gray-400 uppercase">
                        {log.profiles?.avatar_url ? <Image src={log.profiles.avatar_url} alt="avatar" fill sizes="40px" className="object-cover" /> : log.profiles?.username?.substring(0, 2) || "??"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-gray-900 dark:text-gray-100 font-bold text-sm flex items-center gap-1 truncate">
                        {log.role === 'assistant' ? 'beoneofus AI' : `@${log.profiles?.username || 'Unknown'}`}
                        {log.profiles?.is_verified && log.role !== 'assistant' && <VerifiedBadge size={14} />}
                      </h4>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-0.5 truncate">{new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', month:'short', day:'numeric'})}</p>
                    </div>
                  </div>
                  
                  {/* Message Content */}
                  <div className={`flex-1 text-sm p-4 rounded-2xl whitespace-pre-wrap ${log.role === 'assistant' ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100' : 'bg-blue-600 text-white shadow-md shadow-blue-500/20'}`}>
                    {log.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Applications Tab */}
      {adminTab === 'applications' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
            <h4 className="text-gray-900 dark:text-gray-100 font-bold text-sm pl-2">Job Applications Tracker</h4>
            <button onClick={() => setApplications([])} className="text-xs text-blue-600 font-bold hover:underline px-2 transition-all">Refresh</button>
          </div>
          
          {appsLoading ? (
            <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
          ) : applications.length === 0 ? (
            <div className="p-10 text-center text-gray-500 dark:text-gray-400 text-sm font-medium">No applications found.</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[500px] overflow-y-auto custom-scrollbar">
              {applications.map(app => (
                <div key={app.id} onClick={() => setSelectedApp(app)} className="flex flex-col sm:flex-row p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all gap-4 items-start sm:items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      onClick={(e) => { e.stopPropagation(); setSelectedUserId(app.user_id); }}
                      className="relative w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700 flex items-center justify-center font-bold text-gray-500 dark:text-gray-400 uppercase hover:opacity-80 transition-opacity"
                    >
                      {app.profiles?.avatar_url ? <Image src={app.profiles.avatar_url} alt="avatar" fill sizes="40px" className="object-cover" /> : app.profiles?.username?.substring(0, 2) || "??"}
                    </div>
                    <div className="min-w-0 hover:opacity-80 transition-opacity" onClick={(e) => { e.stopPropagation(); setSelectedUserId(app.user_id); }}>
                      <h4 className="text-gray-900 dark:text-gray-100 font-bold text-sm flex items-center gap-1 truncate text-blue-600 dark:text-blue-400">
                        @{app.profiles?.username}
                        {app.profiles?.is_verified && <VerifiedBadge size={14} />}
                      </h4>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-0.5 truncate">
                      {app.profiles?.status && <span className="text-gray-700 dark:text-gray-300 mr-1">{app.profiles.status} •</span>}
                        Applied for: <span className="font-bold text-gray-700 dark:text-gray-300">{app.jobs?.title || 'Unknown Role'}</span> at {app.jobs?.company || 'Unknown'}
                      </p>
                    {app.resume_url && (
                      <a href={app.resume_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                        <FileText size={10} /> View Resume
                      </a>
                    )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:items-end shrink-0 gap-2 mt-2 sm:mt-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border ${
                        app.status === 'accepted' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50' : 
                        app.status === 'declined' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50' : 
                        app.status === 'external_redirect' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50' :
                        'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50'
                      }`}>
                        {app.status === 'external_redirect' ? 'External Redirect' : app.status}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">
                        {new Date(app.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedApp(app); }} 
                      className="mt-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      View Full Application <ChevronRight size={12} />
                    </button>
                    
                    {app.status !== 'accepted' && app.status !== 'declined' && app.status !== 'external_redirect' && (
                      <div className="flex items-center gap-2 mt-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); promptAppAction(app.id, 'declined', app.user_id, app.jobs?.title); }} 
                          className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg font-bold text-[10px] transition-colors border border-red-200 dark:border-red-800/50 uppercase"
                        >
                          Decline
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); promptAppAction(app.id, 'accepted', app.user_id, app.jobs?.title); }} 
                          className="px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 rounded-lg font-bold text-[10px] transition-colors shadow-sm uppercase"
                        >
                          Accept
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Founder Applications Tab */}
      {adminTab === 'founder_apps' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
            <h4 className="text-gray-900 dark:text-gray-100 font-bold text-sm pl-2">Founder & Member Applications</h4>
            <button onClick={() => setFounderApps([])} className="text-xs text-blue-600 font-bold hover:underline px-2 transition-all">Refresh</button>
          </div>
          
          {founderAppsLoading ? (
            <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
          ) : founderApps.length === 0 ? (
            <div className="p-10 text-center text-gray-500 dark:text-gray-400 text-sm font-medium">No founder applications found.</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[500px] overflow-y-auto custom-scrollbar">
              {founderApps.map(app => (
                <div key={app.id} onClick={() => setSelectedFounderApp(app)} className="flex flex-col sm:flex-row p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all gap-4 items-start sm:items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 overflow-hidden shrink-0 border border-blue-200 dark:border-blue-800/50 flex items-center justify-center font-black text-blue-600 dark:text-blue-400 uppercase">
                      {app.name ? app.name.substring(0, 2) : "??"}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-gray-900 dark:text-gray-100 font-bold text-sm flex items-center gap-1 truncate">
                        {app.name}
                      </h4>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-0.5 truncate">
                        Role: <span className="font-bold text-gray-700 dark:text-gray-300">{app.intended_role}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:items-end shrink-0 gap-2 mt-2 sm:mt-0">
                    <div className="flex items-center gap-2">
                      {app.status && (
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border ${
                          app.status === 'accepted' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50' : 
                          app.status === 'declined' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50' : 
                          'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50'
                        }`}>
                          {app.status}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">
                        {new Date(app.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedFounderApp(app); }} 
                      className="mt-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      View Details <ChevronRight size={12} />
                    </button>
                    
                    {app.status !== 'accepted' && app.status !== 'declined' && (
                      <div className="flex items-center gap-2 mt-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); promptFounderAppAction(app.id, 'declined', app.user_id, app.intended_role); }} 
                          className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg font-bold text-[10px] transition-colors border border-red-200 dark:border-red-800/50 uppercase"
                        >
                          Decline
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); promptFounderAppAction(app.id, 'accepted', app.user_id, app.intended_role); }} 
                          className="px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 rounded-lg font-bold text-[10px] transition-colors shadow-sm uppercase"
                        >
                          Accept
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Application Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setSelectedApp(null)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={() => setSelectedApp(null)} className="absolute top-6 right-6 p-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors shadow-sm">
              <X size={18} />
            </button>
            
            <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight pr-8 mb-4">Application Details</h2>
            
            <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
              <div 
                onClick={() => setSelectedUserId(selectedApp.user_id)}
                className="relative w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center font-bold text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:opacity-80 transition-opacity"
              >
                {selectedApp.profiles?.avatar_url ? <Image src={selectedApp.profiles.avatar_url} alt="avatar" fill sizes="48px" className="object-cover" /> : selectedApp.profiles?.username?.substring(0, 2) || "??"}
              </div>
              <div className="cursor-pointer group" onClick={() => setSelectedUserId(selectedApp.user_id)}>
                <h4 className="text-gray-900 dark:text-gray-100 font-bold text-base flex items-center gap-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  @{selectedApp.profiles?.username}
                  {selectedApp.profiles?.is_verified && <VerifiedBadge size={16} />}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {selectedApp.profiles?.status && <span className="block text-gray-700 dark:text-gray-300 mb-0.5 font-medium">{selectedApp.profiles.status}</span>}
                  Applied for <span className="font-bold text-gray-700 dark:text-gray-300">{selectedApp.jobs?.title || 'Unknown Role'}</span> at {selectedApp.jobs?.company || 'Unknown'}
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
                  <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Status</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 capitalize">{selectedApp.status === 'external_redirect' ? 'External Redirect' : selectedApp.status}</p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
                  <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Applied On</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{new Date(selectedApp.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              
              {(selectedApp.cover_letter || selectedApp.message || selectedApp.notes) && (
                <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
                  <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Cover Letter / Message</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedApp.cover_letter || selectedApp.message || selectedApp.notes}</p>
                </div>
              )}

              {selectedApp.resume_url && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-0.5">Attached Document</p>
                    <p className="text-sm font-bold text-blue-900 dark:text-blue-100">Candidate{`'`}s CV / Resume File</p>
                  </div>
                  <a href={selectedApp.resume_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition-colors shadow-sm">
                    <FileText size={16} /> Open File
                  </a>
                </div>
              )}

              {(selectedApp.resume_url || selectedApp.portfolio_url || selectedApp.email || selectedApp.phone || selectedApp.profiles?.github || selectedApp.profiles?.website || selectedApp.profiles?.location) && (
                <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl space-y-3">
                  <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Contact & Links</p>
                  {selectedApp.email && <p className="text-sm"><strong className="text-gray-900 dark:text-gray-100">Email:</strong> <a href={`mailto:${selectedApp.email}`} className="text-blue-600 hover:underline">{selectedApp.email}</a></p>}
                  {selectedApp.phone && <p className="text-sm"><strong className="text-gray-900 dark:text-gray-100">Phone:</strong> {selectedApp.phone}</p>}
                  {selectedApp.profiles?.location && <p className="text-sm"><strong className="text-gray-900 dark:text-gray-100">Location:</strong> {selectedApp.profiles.location}</p>}
                  {selectedApp.resume_url && <p className="text-sm"><strong className="text-gray-900 dark:text-gray-100">Resume:</strong> <a href={selectedApp.resume_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">View Document</a></p>}
                  {selectedApp.portfolio_url && <p className="text-sm"><strong className="text-gray-900 dark:text-gray-100">Portfolio:</strong> <a href={selectedApp.portfolio_url.startsWith('http') ? selectedApp.portfolio_url : `https://${selectedApp.portfolio_url}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{selectedApp.portfolio_url}</a></p>}
                  {selectedApp.profiles?.github && <p className="text-sm"><strong className="text-gray-900 dark:text-gray-100">GitHub:</strong> <a href={`https://github.com/${selectedApp.profiles.github}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">github.com/{selectedApp.profiles.github}</a></p>}
                  {selectedApp.profiles?.website && <p className="text-sm"><strong className="text-gray-900 dark:text-gray-100">Website:</strong> <a href={selectedApp.profiles.website.startsWith('http') ? selectedApp.profiles.website : `https://${selectedApp.profiles.website}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{selectedApp.profiles.website.replace(/^https?:\/\//, '')}</a></p>}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              {selectedApp.status !== 'accepted' && selectedApp.status !== 'declined' && selectedApp.status !== 'external_redirect' ? (
                <>
                  <button 
                    onClick={() => promptAppAction(selectedApp.id, 'declined', selectedApp.user_id, selectedApp.jobs?.title)} 
                    className="flex-1 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl font-bold transition-colors border border-red-200 dark:border-red-800/50"
                  >
                    Decline
                  </button>
                  <button 
                    onClick={() => promptAppAction(selectedApp.id, 'accepted', selectedApp.user_id, selectedApp.jobs?.title)} 
                    className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-colors shadow-sm"
                  >
                    Accept
                  </button>
                </>
              ) : (
                <div className="flex-1 text-center py-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-xs border border-gray-200 dark:border-gray-700">
                  Application is {selectedApp.status === 'external_redirect' ? 'External Redirect' : selectedApp.status}
                </div>
              )}
              <button 
                onClick={() => handleDeleteApp(selectedApp.id)} 
                className="px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-xl font-bold transition-colors border border-gray-200 dark:border-gray-700"
                title="Delete Application Record"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Founder Application Details Modal */}
      {selectedFounderApp && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setSelectedFounderApp(null)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={() => setSelectedFounderApp(null)} className="absolute top-6 right-6 p-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors shadow-sm">
              <X size={18} />
            </button>
            
            <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight pr-8 mb-4">Applicant Review</h2>
            
            <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
              <div className="relative w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 overflow-hidden shrink-0 flex items-center justify-center font-black text-blue-600 dark:text-blue-400 uppercase">
                {selectedFounderApp.name ? selectedFounderApp.name.substring(0, 2) : "??"}
              </div>
              <div>
                <h4 className="text-gray-900 dark:text-gray-100 font-bold text-base flex items-center gap-1">
                  {selectedFounderApp.name}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Applied as <span className="font-bold text-gray-700 dark:text-gray-300 uppercase">{selectedFounderApp.intended_role}</span>
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              {Object.entries(getReasonObj(selectedFounderApp.reason)).map(([key, value], idx) => {
                const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
                return (
                  <div key={idx} className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">{formattedKey}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{value}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              {selectedFounderApp.status !== 'accepted' && selectedFounderApp.status !== 'declined' ? (
                <>
                  <button 
                    onClick={() => promptFounderAppAction(selectedFounderApp.id, 'declined', selectedFounderApp.user_id, selectedFounderApp.intended_role)} 
                    className="flex-1 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl font-bold transition-colors border border-red-200 dark:border-red-800/50"
                  >
                    Decline
                  </button>
                  <button 
                    onClick={() => promptFounderAppAction(selectedFounderApp.id, 'accepted', selectedFounderApp.user_id, selectedFounderApp.intended_role)} 
                    className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-colors shadow-sm"
                  >
                    Accept
                  </button>
                </>
              ) : (
                <div className="flex-1 text-center py-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-xs border border-gray-200 dark:border-gray-700">
                  Status: {selectedFounderApp.status}
                </div>
              )}
              <button 
                onClick={() => handleDeleteFounderApp(selectedFounderApp.id)} 
                className="px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-xl font-bold transition-colors border border-gray-200 dark:border-gray-700"
                title="Delete Application"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks Tab */}
      {adminTab === 'tasks' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h4 className="text-gray-900 dark:text-gray-100 font-bold text-sm pl-2">Task Assignments (Backlog)</h4>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <div className="flex bg-gray-200/50 dark:bg-gray-700/50 p-1 rounded-lg shrink-0">
                {['All', 'High', 'Medium', 'Low'].map(f => (
                  <button 
                    key={f} 
                    onClick={(e) => { e.preventDefault(); setTaskFilter(f); }} 
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${taskFilter === f ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <button onClick={() => setAdminTasks([])} className="text-xs text-blue-600 font-bold hover:underline px-2 transition-all shrink-0">Refresh</button>
              <button onClick={() => setShowTaskModal(true)} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-sm shrink-0"><Plus size={14}/> Assign Task</button>
            </div>
          </div>
          
          {tasksLoading ? (
            <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
          ) : adminTasks.filter(t => taskFilter === 'All' || t.priority === taskFilter).length === 0 ? (
            <div className="p-10 text-center text-gray-500 dark:text-gray-400 text-sm font-medium">No tasks assigned yet.</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[500px] overflow-y-auto custom-scrollbar">
              {adminTasks.filter(t => taskFilter === 'All' || t.priority === taskFilter)
                .sort((a, b) => {
                  const p = { 'High': 3, 'Medium': 2, 'Low': 1 };
                  return (p[b.priority || 'Medium'] || 0) - (p[a.priority || 'Medium'] || 0);
                }).map(task => (
                <div key={task.id} className="flex flex-col p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all gap-2 group">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-gray-900 dark:text-gray-100 font-bold text-sm">{task.title}</h4>
                        {task.priority && (
                          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${task.priority === 'High' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-800/50' : task.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50' : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50'}`}>
                            {task.priority}
                          </span>
                        )}
                      </div>
                      {task.linked_to && (
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1">
                          <FileText size={10} /> {task.linked_to}
                        </p>
                      )}
                    </div>
                    <button 
                      onClick={() => handleComplexUpdate(task.id, task.status === 'completed' ? 'pending' : 'completed')} 
                      disabled={actionProcessing} 
                      className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 ${task.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50'}`}
                    >
                      {task.status}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{task.description}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-800/50">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden relative border border-gray-200 dark:border-gray-700">
                        {task.assigner?.avatar_url ? <Image src={task.assigner.avatar_url} alt="assigner" fill sizes="20px" className="object-cover" /> : <UserCog size={12} className="m-auto mt-1 text-gray-400" />}
                      </div>
                      <span className="text-[9px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">By @{task.assigner?.username || 'Admin'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">To @{task.assignee?.username || 'Unknown'}</span>
                      <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden relative border border-gray-200 dark:border-gray-700">
                        {task.assignee?.avatar_url ? <Image src={task.assignee.avatar_url} alt="assignee" fill sizes="20px" className="object-cover" /> : <User size={12} className="m-auto mt-1 text-gray-400" />}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Assign Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => !actionProcessing && setShowTaskModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setShowTaskModal(false)} disabled={actionProcessing} className="absolute top-6 right-6 p-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors shadow-sm disabled:opacity-50"><X size={18} /></button>
            <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight mb-6 flex items-center gap-2"><ClipboardList size={20} className="text-blue-500"/> Assign New Task</h2>
            <form onSubmit={handleAssignTask} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 block">Assignee</label>
                <select required value={taskForm.assignee_id} onChange={e => setTaskForm({...taskForm, assignee_id: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500 transition-all appearance-none">
                  <option value="" disabled>Select a user...</option>
                  {teamMembers.map(m => {
                    const userProfile = allUsers.find(u => u.id === m.user_id);
                    const displayName = userProfile ? `@${userProfile.username}` : m.name;
                    return (
                      <option key={m.user_id} value={m.user_id}>{displayName} ({m.intended_role})</option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 block">Task Title</label>
                <input required type="text" value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} placeholder="e.g. Implement real-time notifications" className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500 transition-all" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 block">Description</label>
                <textarea required rows={3} value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} placeholder="Task details and requirements..." className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500 transition-all resize-none custom-scrollbar" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 block">Priority Level</label>
                <div className="flex gap-2">
                  {['Low', 'Medium', 'High'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setTaskForm({...taskForm, priority: p})}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${taskForm.priority === p ? (p === 'High' ? 'bg-red-600 text-white border-red-600 shadow-sm' : p === 'Medium' ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-blue-500 text-white border-blue-500 shadow-sm') : 'bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 block">Linked Milestone/Project (Optional)</label>
                <input type="text" value={taskForm.linked_to} onChange={e => setTaskForm({...taskForm, linked_to: e.target.value})} placeholder="e.g. Project Alpha Phase 1" className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500 transition-all" />
              </div>
              <button type="submit" disabled={actionProcessing || !taskForm.assignee_id || !taskForm.title} className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {actionProcessing ? <Loader2 size={16} className="animate-spin" /> : 'Assign Task'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ACTION PROMPT MODAL */}
      {actionPrompt && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => !actionProcessing && setActionPrompt(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setActionPrompt(null)} disabled={actionProcessing} className="absolute top-6 right-6 p-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors shadow-sm disabled:opacity-50">
              <X size={18} />
            </button>
            <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight mb-2">
              {actionPrompt.newStatus === 'accepted' ? 'Accept' : 'Decline'} Application
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Optional: Add a personal message to send to the applicant. Leave blank for a standard message.
            </p>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
              className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none custom-scrollbar mb-6"
            />
            <div className="flex items-center gap-3">
              <button onClick={() => setActionPrompt(null)} disabled={actionProcessing} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={submitActionPrompt} disabled={actionProcessing} className={`flex-1 py-3 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 ${actionPrompt.newStatus === 'accepted' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`}>
                {actionProcessing ? <Loader2 size={16} className="animate-spin" /> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USER PROFILE MODAL */}
      {selectedUserId && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setSelectedUserId(null)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar z-10 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-xl">
            <button 
              onClick={() => setSelectedUserId(null)} 
              className="absolute top-6 right-6 z-[250] p-2 bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-full text-gray-500 dark:text-gray-400 transition-colors shadow-sm"
            >
              <X size={20} />
            </button>
            <div className="p-2 sm:p-6">
              <ProfileContent viewUserId={selectedUserId} />
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Popup */}
      {toast.message && (
        <div className={`fixed bottom-10 right-10 z-[1000] flex items-center gap-3 bg-white dark:bg-gray-900 border px-5 py-3 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-8 duration-300 ${toast.type === 'error' ? 'border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-500' : 'border-indigo-200 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-500'}`}>
          {toast.type === 'error' ? <AlertTriangle size={18} className="text-rose-500" /> : <Check size={18} className="text-indigo-500" />}
          <span className="text-sm font-bold tracking-tight">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

const supportMarkdownComponents = {
  p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2 space-y-1" {...props} />,
  li: ({ node, ...props }) => <li className="pl-1" {...props} />,
  h1: ({ node, ...props }) => <h1 className="text-sm font-black mb-2 mt-3" {...props} />,
  h2: ({ node, ...props }) => <h2 className="text-sm font-bold mb-2 mt-3" {...props} />,
  h3: ({ node, ...props }) => <h3 className="text-xs font-bold mb-1 mt-2" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-bold text-blue-950 dark:text-blue-50" {...props} />,
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    return !inline && match ? (
      <div className="rounded-lg overflow-hidden my-3 border border-blue-200 dark:border-blue-800/50 shadow-sm bg-[#1E1E1E]">
        <div className="bg-gray-800/80 px-3 py-1.5 text-[9px] font-mono text-gray-400 uppercase tracking-widest flex justify-between items-center border-b border-white/5">
          <span>{match[1]}</span>
        </div>
        <SyntaxHighlighter
          {...props}
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          customStyle={{ margin: 0, padding: '0.75rem', background: 'transparent', fontSize: '0.75rem' }}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code {...props} className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-1 py-0.5 rounded font-mono text-[10px] border border-blue-200 dark:border-blue-800/50">
        {children}
      </code>
    );
  }
};

function SupportTypewriterMessage({ content }) {
  const [displayedContent, setDisplayedContent] = useState("");
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setDisplayedContent(content.slice(0, i + 1));
      i++;
      if (i >= content.length) clearInterval(timer);
    }, 15);
    return () => clearInterval(timer);
  }, [content]);
  return <ReactMarkdown components={supportMarkdownComponents}>{displayedContent}</ReactMarkdown>;
}

const SupportTool = () => {
  const [issue, setIssue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [tickets, setTickets] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!issue.trim() || isProcessing) return;
    
    const currentIssue = issue;
    setIssue('');
    setIsProcessing(true);
    
    try {
      const prompt = `You are the official technical support engineering AI for the beoneofus platform. A user has submitted the following support ticket: "${currentIssue}". Please provide a helpful, concise, and highly technical resolution to their issue.`;
      
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error("AI API not active. Please restart your dev server."); }
      if (!res.ok) throw new Error(data.error || "Failed to fetch response");

      setTickets(prev => [{ id: Date.now(), issue: currentIssue, reply: data.message.content.replace(/^["']|["']$/g, '').trim(), isNew: true }, ...prev]);
    } catch (error) {
      setTickets(prev => [{ id: Date.now(), issue: currentIssue, reply: "Error contacting support AI: " + error.message, isNew: true }, ...prev]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto py-4">
      <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-[2rem] flex items-start gap-5">
        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-blue-200 dark:border-blue-800/50">
          <HelpCircle size={24} />
        </div>
        <div>
          <h3 className="text-blue-700 dark:text-blue-400 font-bold text-lg mb-2">Need Technical Assistance?</h3>
          <p className="text-sm text-blue-600/80 dark:text-blue-400/80 leading-relaxed">
            Our AI support engineering team is ready to help you instantly with architecture reviews, debugging, and platform guidance.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 shadow-xl">
        <div>
          <label className="block text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-3 pl-2">Describe your issue</label>
          <textarea 
            rows={4}
            required
            value={issue}
            onChange={e => setIssue(e.target.value)}
            placeholder="E.g., I am getting a 500 error when trying to invoke a serverless function..."
            className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-2xl p-5 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 custom-scrollbar"
            disabled={isProcessing}
          />
        </div>
        <button disabled={isProcessing || !issue.trim()} type="submit" className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
          {isProcessing ? <><Loader2 size={16} className="animate-spin" /> Analyzing Issue...</> : 'Submit Support Ticket'}
        </button>
      </form>

      {tickets.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-gray-900 dark:text-gray-100 font-bold text-sm pl-2 mt-8">Recent Tickets</h4>
          {tickets.map(ticket => (
            <div key={ticket.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Your Issue</p>
                <p className="text-sm text-gray-800 dark:text-gray-200">{ticket.issue}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50">
                <div className="flex items-center gap-2 mb-2">
                  <Bot size={14} className="text-blue-600 dark:text-blue-400" />
                  <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Support AI Reply</p>
                </div>
                <div className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed">
                  {ticket.isNew ? (
                    <SupportTypewriterMessage content={ticket.reply} />
                  ) : (
                    <ReactMarkdown components={supportMarkdownComponents}>{ticket.reply}</ReactMarkdown>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const UserDashboardTool = ({ currentUserId }) => {
  const [activeTab, setActiveTab] = useState('');
  const [isFounderOrMember, setIsFounderOrMember] = useState(null);
  const [myTasks, setMyTasks] = useState([]);
  const [myJobApps, setMyJobApps] = useState([]);
  const [myFounderApps, setMyFounderApps] = useState([]);
  const [myNotifications, setMyNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [dashboardLink, setDashboardLink] = useState(null);
  const [taskFilter, setTaskFilter] = useState('All');

  const FEATURES_LIST = [
    { id: 1, title: 'Real-time Workspace Chat', desc: 'Secure, end-to-end encrypted node communication is now live.', date: 'May 1, 2026' },
    { id: 2, title: 'AI Support Engineer', desc: 'Get instant technical assistance from our integrated AI.', date: 'April 28, 2026' },
    { id: 3, title: 'Advanced Code Review Tools', desc: 'Highlight and analyze code directly in your feed.', date: 'April 15, 2026' },
  ];

  useEffect(() => {
    if (!currentUserId) return;
    const checkStatus = async () => {
      setLoading(true);
      const { data } = await supabase.from('founder_applications').select('id, status, intended_role').eq('user_id', currentUserId);
      if (data && data.length > 0) {
        setIsFounderOrMember(true);
        setActiveTab(prev => prev || 'tasks');
        const accepted = data.find(app => app.status === 'accepted');
        if (accepted) {
          setDashboardLink(accepted.intended_role === 'cofounder' ? '/founder-dashboard' : '/member-dashboard');
        }
      } else {
        setIsFounderOrMember(false);
        setActiveTab(prev => prev || 'job_apps');
      }
      setLoading(false);
    };
    checkStatus();
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId || isFounderOrMember !== true) return;
    let channel;

    const fetchTasks = async () => {
      const { data } = await supabase.from('tasks').select(`
        *,
        assignee:profiles!tasks_assignee_id_fkey(username, avatar_url),
        assigner:profiles!tasks_assigner_id_fkey(username, avatar_url)
      `).or(`assignee_id.eq.${currentUserId},assigner_id.eq.${currentUserId}`).order('created_at', { ascending: false });
      if (data) setMyTasks(data);
    };

    if (activeTab === 'tasks') {
      fetchTasks(); // Fetch initial state
      channel = supabase.channel(`user-tasks-${currentUserId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
          fetchTasks(); // Refresh tasks live when admin updates them
        }).subscribe();
    }
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [activeTab, currentUserId, isFounderOrMember]);

  useEffect(() => {
    if (!currentUserId || isFounderOrMember !== false) return;
    const fetchJobApps = async () => {
      setLoading(true);
      const { data } = await supabase.from('job_applications').select('*, jobs(title, company)').eq('user_id', currentUserId).order('created_at', { ascending: false });
      if (data) setMyJobApps(data);
      setLoading(false);
    };
    if (activeTab === 'job_apps' && myJobApps.length === 0) fetchJobApps();
  }, [activeTab, currentUserId, isFounderOrMember, myJobApps.length]);

  useEffect(() => {
    if (!currentUserId || isFounderOrMember !== true) return;
    const fetchFounderApps = async () => {
      setLoading(true);
      const { data } = await supabase.from('founder_applications').select('*').eq('user_id', currentUserId).order('created_at', { ascending: false });
      if (data) setMyFounderApps(data);
      setLoading(false);
    };
    if (activeTab === 'founder_apps' && myFounderApps.length === 0) fetchFounderApps();
  }, [activeTab, currentUserId, isFounderOrMember, myFounderApps.length]);

  useEffect(() => {
    if (!currentUserId || isFounderOrMember !== false) return;
    const fetchNotifs = async () => {
      setLoading(true);
      const { data } = await supabase.from('notifications').select('*').eq('receiver_id', currentUserId).order('created_at', { ascending: false }).limit(20);
      if (data) setMyNotifications(data);
      setLoading(false);
    };
    if (activeTab === 'notifications' && myNotifications.length === 0) fetchNotifs();
  }, [activeTab, currentUserId, isFounderOrMember, myNotifications.length]);

  const handleTaskUpdate = async (taskId, newStatus) => {
    setActionProcessing(true);
    try {
      const task = myTasks.find(t => t.id === taskId);
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
      if (error) throw error;
      setMyTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

      // Notify the assigner when marking as completed
      if (newStatus === 'completed' && task && task.assigner_id && task.assigner_id !== currentUserId) {
        await supabase.from('notifications').insert({
          receiver_id: task.assigner_id,
          actor_id: currentUserId,
          type: 'message',
          content: `marked the task "${task.title}" as completed.`
        });
      }
    } catch (err) {
      alert("Error updating task: " + err.message);
    } finally {
      setActionProcessing(false);
    }
  };

  const handleDeleteJobApp = async (appId) => {
    if (!confirm("Are you sure you want to delete this application?")) return;
    try {
      const { error } = await supabase.from('job_applications').delete().eq('id', appId);
      if (error) throw error;
      setMyJobApps(prev => prev.filter(app => app.id !== appId));
    } catch (err) {
      alert("Error deleting application: " + err.message);
    }
  };

  const handleDeleteFounderApp = async (appId) => {
    if (!confirm("Are you sure you want to delete this application?")) return;
    try {
      const { error } = await supabase.from('founder_applications').delete().eq('id', appId);
      if (error) throw error;
      setMyFounderApps(prev => prev.filter(app => app.id !== appId));
    } catch (err) {
      alert("Error deleting application: " + err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50 rounded-[2rem]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-purple-200 dark:border-purple-800/50">
            <UserCog size={24} />
          </div>
          <div>
            <h3 className="text-purple-700 dark:text-purple-400 font-bold text-lg mb-1">My Dashboard</h3>
            <p className="text-sm text-purple-600/80 dark:text-purple-400/80 leading-relaxed">Manage your personal tasks and applications.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 w-full sm:w-auto">
          {dashboardLink && (
            <a href={dashboardLink} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 w-full sm:w-auto">
              Go to Workspace <ChevronRight size={14} />
            </a>
          )}
          <div className="flex bg-white dark:bg-gray-900 p-1 rounded-xl border border-purple-200 dark:border-purple-800/50 shadow-sm shrink-0 overflow-x-auto w-full sm:w-auto">
          {isFounderOrMember === true && (
            <>
              <button onClick={() => setActiveTab('tasks')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'tasks' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>Tasks</button>
              <button onClick={() => setActiveTab('founder_apps')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'founder_apps' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>Founder Apps</button>
            </>
          )}
          {isFounderOrMember === false && (
            <>
              <button onClick={() => setActiveTab('job_apps')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'job_apps' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>Job Apps</button>
              <button onClick={() => setActiveTab('notifications')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'notifications' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>Notifications</button>
              <button onClick={() => setActiveTab('features')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'features' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>New Features</button>
            </>
          )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col">
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-purple-500" /></div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[500px] overflow-y-auto custom-scrollbar">
            {activeTab === 'tasks' && (
              <>
                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mr-1 shrink-0">Filter Backlog:</span>
                  {['All', 'High', 'Medium', 'Low'].map(f => (
                    <button 
                      key={f} 
                      onClick={(e) => { e.preventDefault(); setTaskFilter(f); }} 
                      className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all border shrink-0 ${taskFilter === f ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 border-purple-200 dark:border-purple-800' : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                {myTasks.filter(t => taskFilter === 'All' || t.priority === taskFilter).length === 0 ? <div className="p-10 text-center text-gray-500 text-sm">No tasks found.</div> :
                myTasks.filter(t => taskFilter === 'All' || t.priority === taskFilter)
                  .sort((a, b) => {
                    const p = { 'High': 3, 'Medium': 2, 'Low': 1 };
                    return (p[b.priority || 'Medium'] || 0) - (p[a.priority || 'Medium'] || 0);
                  }).map(task => (
                <div key={task.id} className="flex flex-col p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all gap-2 group border-b border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-gray-900 dark:text-gray-100 font-bold text-sm">{task.title}</h4>
                        {task.priority && (
                          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${task.priority === 'High' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-800/50' : task.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50' : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50'}`}>
                            {task.priority}
                          </span>
                        )}
                      </div>
                      {task.linked_to && (
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1">
                          <FileText size={10} /> {task.linked_to}
                        </p>
                      )}
                    </div>
                    <button 
                      onClick={() => handleTaskUpdate(task.id, task.status === 'completed' ? 'pending' : 'completed')} 
                      disabled={actionProcessing} 
                      className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 ${task.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50'}`}
                    >
                      {task.status}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{task.description}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-800/50">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden relative border border-gray-200 dark:border-gray-700">
                        {task.assigner?.avatar_url ? <Image src={task.assigner.avatar_url} alt="assigner" fill sizes="20px" className="object-cover" /> : <UserCog size={12} className="m-auto mt-1 text-gray-400" />}
                      </div>
                      <span className="text-[9px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">By @{task.assigner?.username || 'Admin'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">To @{task.assignee?.username || 'Unknown'}</span>
                      <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden relative border border-gray-200 dark:border-gray-700">
                        {task.assignee?.avatar_url ? <Image src={task.assignee.avatar_url} alt="assignee" fill sizes="20px" className="object-cover" /> : <User size={12} className="m-auto mt-1 text-gray-400" />}
                      </div>
                    </div>
                  </div>
                </div>
                ))}
              </>
            )}

            {activeTab === 'job_apps' && (
              myJobApps.length === 0 ? <div className="p-10 text-center text-gray-500 text-sm">No job applications found.</div> :
              myJobApps.map(app => (
                <div key={app.id} className="flex flex-col sm:flex-row p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all gap-4 items-start sm:items-center justify-between border-b border-gray-100 dark:border-gray-800">
                  <div className="flex flex-col gap-1 min-w-0">
                    <h4 className="text-gray-900 dark:text-gray-100 font-bold text-sm truncate text-blue-600 dark:text-blue-400">
                      {app.jobs?.title || 'Unknown Role'}
                    </h4>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-0.5 truncate">
                      at {app.jobs?.company || 'Unknown Company'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border ${
                      app.status === 'accepted' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50' : 
                      app.status === 'declined' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50' : 
                      'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50'
                    }`}>
                      {app.status}
                    </span>
                    <button onClick={() => handleDeleteJobApp(app.id)} className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}

            {activeTab === 'founder_apps' && (
              myFounderApps.length === 0 ? <div className="p-10 text-center text-gray-500 text-sm">No founder applications found.</div> :
              myFounderApps.map(app => (
                <div key={app.id} className="flex flex-col sm:flex-row p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all gap-4 items-start sm:items-center justify-between border-b border-gray-100 dark:border-gray-800">
                  <div className="flex flex-col gap-1 min-w-0">
                    <h4 className="text-gray-900 dark:text-gray-100 font-bold text-sm truncate capitalize text-purple-600 dark:text-purple-400">
                      {app.intended_role}
                    </h4>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-0.5 truncate">
                      Applied on {new Date(app.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border ${app.status === 'accepted' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50' : app.status === 'declined' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50'}`}>
                      {app.status}
                    </span>
                    <button onClick={() => handleDeleteFounderApp(app.id)} className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}

        {activeTab === 'notifications' && (
          myNotifications.length === 0 ? <div className="p-10 text-center text-gray-500 text-sm">No recent notifications.</div> :
          myNotifications.map(notif => (
            <div key={notif.id} className="flex flex-col p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all gap-2 group border-b border-gray-100 dark:border-gray-800">
              <p className="text-sm text-gray-800 dark:text-gray-200"><span className="font-bold capitalize text-purple-600 dark:text-purple-400">{(notif.type || 'Alert').replace('_', ' ')}:</span> {notif.content}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">{new Date(notif.created_at).toLocaleDateString()}</p>
            </div>
          ))
        )}

        {activeTab === 'features' && (
          FEATURES_LIST.map(feature => (
            <div key={feature.id} className="flex flex-col p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all gap-2 group border-b border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-start">
                <h4 className="text-gray-900 dark:text-gray-100 font-bold text-sm text-purple-600 dark:text-purple-400">{feature.title}</h4>
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800/50">New</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300">{feature.desc}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">{feature.date}</p>
            </div>
          ))
        )}

            {activeTab === 'notifications' && (
              myNotifications.length === 0 ? <div className="p-10 text-center text-gray-500 text-sm">No recent notifications.</div> :
              myNotifications.map(notif => (
                <div key={notif.id} className="flex flex-col p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all gap-2 group border-b border-gray-100 dark:border-gray-800">
                  <p className="text-sm text-gray-800 dark:text-gray-200"><span className="font-bold capitalize text-purple-600 dark:text-purple-400">{(notif.type || 'Alert').replace('_', ' ')}:</span> {notif.content}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">{new Date(notif.created_at).toLocaleDateString()}</p>
                </div>
              ))
            )}

            {activeTab === 'features' && (
              FEATURES_LIST.map(feature => (
                <div key={feature.id} className="flex flex-col p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all gap-2 group border-b border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-start">
                    <h4 className="text-gray-900 dark:text-gray-100 font-bold text-sm text-purple-600 dark:text-purple-400">{feature.title}</h4>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800/50">New</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300">{feature.desc}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">{feature.date}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const MORE_TOOLS = [
  { 
    id: "user_dashboard", 
    label: "My Dashboard", 
    icon: <UserCog size={20} />, 
    desc: "Manage your applications & tasks", 
    details: "View your job applications, founder applications, and assigned tasks." 
  },
  { 
    id: "api", 
    label: "API Access", 
    icon: <Code2 size={20} />, 
    desc: "Developer tools & keys", 
    details: "Integrate SAVIOMDS into your own workflows using our REST API and Webhooks." 
  },
  { 
    id: "status", 
    label: "System Status", 
    icon: <Zap size={20} />, 
    desc: "Check platform health", 
    details: "Current status: All systems operational. Check latency for Mauritius region nodes." 
  },
  { 
    id: "community", 
    label: "Community Hub", 
    icon: <Globe size={20} />, 
    desc: "Join the conversation", 
    details: "Connect with other TechNinja developers and share your latest Next.js projects." 
  },
  { 
    id: "support", 
    label: "Help & Support", 
    icon: <HelpCircle size={20} />, 
    desc: "Get technical help", 
    details: "Access our documentation or open a ticket with our support engineering team." 
  },
  { 
    id: "admin", 
    label: "Admin Dashboard", 
    icon: <ShieldAlert size={20} />, 
    desc: "Platform management", 
    details: "Review verification requests and manage the network." 
  },
];

export default function MoreContent() {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [copiedProfile, setCopiedProfile] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Filter tools so non-admins never even see the Admin Panel option
  const visibleTools = MORE_TOOLS.filter(t => t.id !== 'admin' || isAdmin);

  // Derive active tool directly from search parameters without needing useEffect or state
  const toolParam = searchParams?.get('tool');
  const activeItem = toolParam ? visibleTools.find(t => t.id === toolParam) || null : null;

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setCurrentUserId(session.user.id);
        const { data } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single();
        if (data?.is_admin) setIsAdmin(true);
      }
    };
    getSession();
  }, []);

  const handleOpenTool = (tool) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set('tool', tool.id);
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newUrl, { scroll: false });
  };

  const handleCloseTool = () => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete('tool');
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newUrl, { scroll: false });
  };

  const handleShareProfile = () => {
    if (currentUserId) {
      navigator.clipboard.writeText(`${window.location.origin}/u/${currentUserId}`);
      setCopiedProfile(true);
      setTimeout(() => setCopiedProfile(false), 2000);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  return (
    <div className="w-full flex flex-col bg-transparent animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 no-scrollbar relative">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tighter">Resources</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium">Extra tools for your development workflow.</p>
      </div>

      {/* Grid Layout - 2 Columns on desktop to use the mid-section width better */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visibleTools.map((tool) => (
          <div 
            key={tool.id}
        onClick={() => handleOpenTool(tool)}
            className="group flex items-center justify-between p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[1.5rem] hover:border-blue-500/30 dark:hover:border-blue-500/30 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {tool.icon}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight">{tool.label}</span>
                <span className="text-[11px] text-gray-600 dark:text-gray-400 font-bold uppercase tracking-wider">{tool.desc}</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all" />
          </div>
        ))}
      </div>

      {/* Secondary Actions */}
      <div className="mt-8 space-y-2">
         
         
         <button 
           onClick={handleSignOut}
           className="w-full flex items-center gap-3 p-4 text-red-500/60 hover:text-red-500 transition-all"
         >
            <LogOut size={18} />
            <span className="text-sm font-bold">Sign Out</span>
         </button>
      </div>

      {/* --- FULL PAGE TOOL MODAL --- */}
      {activeItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-md"
            onClick={handleCloseTool}
          />
          
          <div className="relative w-full max-w-4xl h-[85vh] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
                   {activeItem.icon}
                 </div>
                 <div>
                   <h2 className="text-xl font-black text-gray-900 dark:text-gray-100">{activeItem.label}</h2>
                   <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{activeItem.desc}</p>
                 </div>
               </div>
               <button onClick={handleCloseTool} className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-all rounded-xl">
                 <X size={20} />
               </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white dark:bg-gray-900 custom-scrollbar relative">
               {activeItem.id === 'user_dashboard' && <UserDashboardTool currentUserId={currentUserId} />}
               {activeItem.id === 'status' && <SystemStatusTool />}
               {activeItem.id === 'api' && <ApiAccessTool />}
               {activeItem.id === 'community' && <CommunityHubTool currentUserId={currentUserId} />}
               {activeItem.id === 'support' && <SupportTool />}
               {activeItem.id === 'admin' && <AdminPanelTool currentUserId={currentUserId} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}