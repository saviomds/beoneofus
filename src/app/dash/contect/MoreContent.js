"use client";

import { useState, useEffect, useRef } from "react";
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
  ShieldAlert,
  ShieldCheck,
  Loader2,
  Search,
  Trash2,
  Users
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import ProfileContent from "./ProfileContent";
import VerifiedBadge from "../../components/VerifiedBadge";

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
         <div className="p-6 bg-gray-50 border border-gray-200 rounded-2xl flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={18} className="text-gray-500" />
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Network Latency</p>
            </div>
            <div className="flex items-end gap-2">
               <span className="text-5xl font-black text-gray-900 tracking-tighter">{ping}</span>
               <span className="text-gray-500 mb-1 font-bold">ms</span>
            </div>
         </div>
         <div className="p-6 bg-gray-50 border border-gray-200 rounded-2xl flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Database size={18} className="text-gray-500" />
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Platform Health</p>
            </div>
            <div className="flex items-center gap-3 mt-2">
               <div className={`w-4 h-4 rounded-full shadow-lg ${status === 'Operational' ? 'bg-green-500 shadow-green-500/50 animate-pulse' : 'bg-red-500 shadow-red-500/50'}`} />
               <span className={`text-2xl font-black tracking-tight ${status === 'Operational' ? 'text-green-400' : 'text-red-400'}`}>{status}</span>
            </div>
         </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 shadow-sm">
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-6">Real-Time Packet Monitor</p>
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
          <h3 className="text-gray-900 font-bold text-lg">Active Secret Keys</h3>
          <p className="text-gray-500 text-sm mt-1">Do not share your API keys in publicly accessible areas.</p>
        </div>
        <button onClick={generateKey} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 shrink-0">
          <Plus size={16} /> Create New Key
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
        {keys.length === 0 ? (
           <div className="p-10 text-center text-gray-500 text-sm">No API keys found. Generate one to get started.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {keys.map(k => (
              <div key={k.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-gray-50 transition-all gap-4">
                <div>
                  <h4 className="text-gray-900 font-bold text-sm flex items-center gap-2 mb-1">
                    <Key size={14} className={k.key.startsWith('sk_live') ? 'text-green-500' : 'text-amber-500'} /> 
                    {k.name}
                  </h4>
                  <p className="text-xs text-gray-600 font-mono tracking-wider bg-gray-100 px-2 py-1 rounded inline-block border border-gray-200">{k.key.substring(0, 12)}••••••••••••••••</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest hidden sm:block mr-2">{k.created}</span>
                  <button onClick={() => handleCopy(k.key)} className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-gray-900 transition-all border border-gray-200" title="Copy Key">
                    {copied === k.key ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                  <button onClick={() => deleteKey(k.id)} className="p-2.5 bg-gray-50 hover:bg-red-50 rounded-xl text-gray-500 hover:text-red-600 transition-all border border-gray-200" title="Revoke Key">
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
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-[2rem] overflow-hidden max-w-4xl mx-auto shadow-lg">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
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
               className="relative w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-xs uppercase shrink-0 mt-auto cursor-pointer hover:bg-blue-100 transition-colors overflow-hidden"
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
             {msg.user_id !== currentUserId && <span className="text-[10px] text-gray-500 font-bold mb-1 pl-1 flex items-center gap-1">
               @{msg.profiles?.username}
               {msg.profiles?.is_verified && <VerifiedBadge size={10} />}
             </span>}
               <div className={`w-full px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${msg.user_id === currentUserId ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-50 text-gray-800 border border-gray-200 rounded-tl-none'}`}>
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
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setSelectedUserId(null)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar z-10 bg-white rounded-[2rem] border border-gray-200 shadow-xl">
            <button 
              onClick={() => setSelectedUserId(null)} 
              className="absolute top-6 right-6 z-[250] p-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-full text-gray-500 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="p-2 sm:p-6">
              <ProfileContent viewUserId={selectedUserId} />
            </div>
          </div>
        </div>
      )}
      <form onSubmit={handleSend} className="p-3 bg-gray-50 border-t border-gray-200 flex gap-2 shrink-0">
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder="Broadcast to community..." 
          className="flex-1 bg-white border border-gray-300 rounded-2xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
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
  const [adminTab, setAdminTab] = useState('requests'); // 'requests' | 'users'
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");

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

  // Fetch all users when the 'Users' tab is opened
  useEffect(() => {
    if (adminTab === 'users' && isAdmin && allUsers.length === 0) {
      const fetchAllUsers = async () => {
        setUsersLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, status, is_verified')
          .limit(100);
        if (error) console.error("Error fetching users:", error);
        if (data) setAllUsers(data);
        setUsersLoading(false);
      };
      fetchAllUsers();
    }
  }, [adminTab, isAdmin, allUsers.length]);

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

    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`Are you sure you want to permanently delete @${username}?`)) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      setAllUsers(prev => prev.filter(u => u.id !== userId));
      alert(`User @${username} has been deleted.`);
    } catch (err) {
      alert("Error deleting user: " + err.message);
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-blue-50 border border-blue-200 rounded-[2rem]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-blue-200">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 className="text-blue-700 font-bold text-lg mb-1">Admin Dashboard</h3>
            <p className="text-sm text-blue-600/80 leading-relaxed">Manage the platform and verify nodes.</p>
          </div>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-blue-200 shadow-sm shrink-0">
          <button onClick={() => setAdminTab('requests')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${adminTab === 'requests' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>Requests</button>
          <button onClick={() => setAdminTab('users')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${adminTab === 'users' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>Users</button>
        </div>
      </div>

      {/* Requests Tab */}
      {adminTab === 'requests' && (
        <div className="bg-white border border-gray-200 rounded-[2.5rem] overflow-hidden shadow-sm">
        {requests.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm font-medium">No pending verification requests.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {requests.map(req => (
              <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-gray-50 transition-all gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center font-bold text-gray-500 uppercase">
                    {req.avatar_url ? (
                      <Image src={req.avatar_url} alt="avatar" fill sizes="48px" className="object-cover" />
                    ) : (
                      req.username?.substring(0, 2) || "??"
                    )}
                  </div>
                  <div>
                    <h4 className="text-gray-900 font-bold text-sm">@{req.username}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{req.status || 'Active Node'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleAction(req.id, 'reject')} className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold text-xs transition-colors border border-red-200">
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
        <div className="bg-white border border-gray-200 rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users by username..." 
                className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          
          {usersLoading ? (
            <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
          ) : allUsers.length === 0 ? (
            <div className="p-10 text-center text-gray-500 text-sm font-medium">No users found.</div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto custom-scrollbar">
              {allUsers.filter(u => u.username.toLowerCase().includes(userSearch.toLowerCase())).map(user => (
                <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-gray-50 transition-all gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-10 h-10 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center font-bold text-gray-500 uppercase">
                      {user.avatar_url ? <Image src={user.avatar_url} alt="avatar" fill sizes="40px" className="object-cover" /> : user.username?.substring(0, 2) || "??"}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-gray-900 font-bold text-sm flex items-center gap-1 truncate">
                        @{user.username}
                        {user.is_verified && <VerifiedBadge size={14} />}
                      </h4>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5 truncate">{user.status || 'Active Node'}</p>
                    </div>
                  </div>
                  <div className="flex items-center shrink-0">
                    <button onClick={() => handleDeleteUser(user.id, user.username)} className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-colors border border-red-200 hover:border-red-600" title="Delete User"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SupportTool = () => {
  const [submitted, setSubmitted] = useState(false);
  const [issue, setIssue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setIssue('');
    }, 3000);
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto py-4">
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-[2rem] flex items-start gap-5">
        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-blue-200">
          <HelpCircle size={24} />
        </div>
        <div>
          <h3 className="text-blue-700 font-bold text-lg mb-2">Need Technical Assistance?</h3>
          <p className="text-sm text-blue-600/80 leading-relaxed">
            Our engineering team is ready to help you with architecture reviews, debugging, and platform guidance. Expected response time: &lt; 2 hours.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 sm:p-8 rounded-[2.5rem] border border-gray-200 shadow-xl">
        <div>
          <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3 pl-2">Describe your issue</label>
          <textarea 
            rows={6}
            required
            value={issue}
            onChange={e => setIssue(e.target.value)}
            placeholder="E.g., I am getting a 500 error when trying to invoke a serverless function..."
            className="w-full bg-gray-50 border border-gray-300 rounded-2xl p-5 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none transition-all placeholder:text-gray-400 custom-scrollbar"
          />
        </div>
        <button disabled={submitted || !issue.trim()} type="submit" className="w-full py-4 bg-blue-600 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
          {submitted ? 'Ticket Submitted Successfully' : 'Open Support Ticket'}
        </button>
      </form>
    </div>
  );
};

const MORE_TOOLS = [
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
  const [activeItem, setActiveItem] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [copiedProfile, setCopiedProfile] = useState(false);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id || null);
    };
    getSession();
  }, []);

  const handleShareProfile = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopiedProfile(true);
    setTimeout(() => setCopiedProfile(false), 2000);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  return (
    <div className="w-full flex flex-col bg-transparent animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 no-scrollbar relative">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Resources</h1>
        <p className="text-gray-500 text-sm mt-1 font-medium">Extra tools for your development workflow.</p>
      </div>

      {/* Grid Layout - 2 Columns on desktop to use the mid-section width better */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {MORE_TOOLS.map((tool) => (
          <div 
            key={tool.id}
            onClick={() => setActiveItem(tool)}
            className="group flex items-center justify-between p-5 bg-white border border-gray-200 rounded-[1.5rem] hover:border-blue-500/30 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 group-hover:text-blue-600 transition-colors">
                {tool.icon}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-900 tracking-tight">{tool.label}</span>
                <span className="text-[11px] text-gray-600 font-bold uppercase tracking-wider">{tool.desc}</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-600 transition-all" />
          </div>
        ))}
      </div>

      {/* Secondary Actions */}
      <div className="mt-8 space-y-2">
         <button 
           onClick={handleShareProfile}
           className="w-full flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all group"
         >
            <div className="flex items-center gap-3">
               {copiedProfile ? <Check size={18} className="text-green-500" /> : <Share2 size={18} />}
               <span className="text-sm font-bold">{copiedProfile ? "Copied to clipboard!" : "Share Profile"}</span>
            </div>
            <span className="text-[10px] font-black text-gray-600 group-hover:text-blue-500 transition-colors">SAVIOMDS.DEV</span>
         </button>
         
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
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-md"
            onClick={() => setActiveItem(null)}
          />
          
          <div className="relative w-full max-w-4xl h-[85vh] bg-white border border-gray-200 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
                   {activeItem.icon}
                 </div>
                 <div>
                   <h2 className="text-xl font-black text-gray-900">{activeItem.label}</h2>
                   <p className="text-xs text-gray-500 font-medium">{activeItem.desc}</p>
                 </div>
               </div>
               <button onClick={() => setActiveItem(null)} className="p-2.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-all rounded-xl">
                 <X size={20} />
               </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white custom-scrollbar relative">
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