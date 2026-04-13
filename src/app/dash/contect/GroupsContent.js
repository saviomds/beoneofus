"use client";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { 
  Plus, 
  Users, 
  Lock, 
  Globe, 
  Search, 
  ChevronRight, 
  X, 
  Image as ImageIcon,
  Loader2,
  Check,
  UserPlus,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { supabase } from "../../supabaseClient";

export default function GroupsContent() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");

  // Create Group Form States
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isPrivateSelection, setIsPrivateSelection] = useState(false);
  const fileInputRef = useRef(null);

  // Invite User States
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [inviteUsername, setInviteUsername] = useState("");

  // Delete Group States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);

  // Fetch Groups
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setCurrentUserId(session.user.id);
      await fetchGroups();
    };
    init();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      // Fetch groups and the count of members
      const { data, error } = await supabase
        .from('groups')
        .select('*, group_members(count)')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setGroups(data || []);
    } catch (err) {
      console.error("Error fetching groups:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Image Upload logic
  const handleImageClick = () => fileInputRef.current?.click();

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (e) => {
    e.stopPropagation();
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const showToast = (msg, type = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 3000);
  };

  // --- CREATE GROUP ---
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!name.trim() || !currentUserId) return;
    setIsProcessing(true);

    try {
      // 1. Create the Group
      const { data: newGroup, error: groupError } = await supabase.from('groups').insert({
        name,
        description,
        is_private: isPrivateSelection,
        created_by: currentUserId
      }).select().single();
      if (groupError) throw groupError;

      // 2. Add the creator as the Admin in group_members
      const { error: memberError } = await supabase.from('group_members').insert({
        group_id: newGroup.id,
        user_id: currentUserId,
        role: 'admin'
      });
      if (memberError) {
        // Rollback: if adding the member fails, delete the group we just created to prevent ghost groups
        await supabase.from('groups').delete().eq('id', newGroup.id);
        throw memberError;
      }

      showToast("Group created successfully!");
      setIsModalOpen(false);
      setName("");
      setDescription("");
      setIsPrivateSelection(false);
      setImagePreview(null);
      fetchGroups();
    } catch (err) {
      showToast("Failed to create group: " + err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- INVITE USER ---
  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!inviteUsername.trim() || !selectedGroup) return;
    setIsProcessing(true);

    try {
      // Find user by username
      const { data: profile, error: profileErr } = await supabase.from('profiles').select('id').eq('username', inviteUsername.trim()).maybeSingle();
      if (profileErr || !profile) throw new Error(`User @${inviteUsername} not found.`);

      if (profile.id === currentUserId) throw new Error("You cannot invite yourself to the group.");

      // Insert into members
      const { error: inviteErr } = await supabase.from('group_members').insert({ group_id: selectedGroup.id, user_id: profile.id, role: 'member' });
      if (inviteErr) {
        // Catch PostgreSQL duplicate key error (code 23505)
        if (inviteErr.code === '23505' || inviteErr.message.includes('duplicate')) {
          throw new Error(`@${inviteUsername} is already a member of this group.`);
        }
        throw inviteErr;
      }

      // Send Notification to the invited user
      const { error: notifErr } = await supabase.from('notifications').insert({
        receiver_id: profile.id,
        actor_id: currentUserId,
        type: 'group_invite',
        content: selectedGroup.name
      });
      if (notifErr) throw new Error("Invite sent, but notification failed: " + notifErr.message);

      showToast(`@${inviteUsername} has been granted access!`);
      setInviteModalOpen(false);
      setInviteUsername("");
      fetchGroups();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- DELETE GROUP ---
  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;
    setIsProcessing(true);

    try {
      // 1. Delete associated members first to avoid Foreign Key constraint errors
      const { error: membersError } = await supabase.from('group_members').delete().eq('group_id', groupToDelete.id);
      if (membersError) throw membersError;

      // 2. Delete the group
      // Use .select() to force Supabase to return the deleted row. If it's empty, RLS blocked it!
      const { data: deletedGroup, error: groupError } = await supabase.from('groups').delete().eq('id', groupToDelete.id).select();
      if (groupError) throw groupError;
      
      if (!deletedGroup || deletedGroup.length === 0) {
        throw new Error("Deletion blocked by database (RLS). You don't have permission.");
      }

      showToast("Group deleted successfully");
      setDeleteModalOpen(false);
      setGroupToDelete(null);
      fetchGroups();
    } catch (err) {
      showToast("Failed to delete group: " + err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- DELETE ALL GROUPS ---
  const executeDeleteAllGroups = async () => {
    setIsProcessing(true);
    try {
      // 1. Fetch all groups created by the user
      const { data: userGroups } = await supabase.from('groups').select('id').eq('created_by', currentUserId);
      
      if (userGroups && userGroups.length > 0) {
        const groupIds = userGroups.map(g => g.id);
        
        // 2. Delete all members for these groups first
        await supabase.from('group_members').delete().in('group_id', groupIds);

        // 3. Delete the groups themselves
        const { data: deletedGroups, error: groupError } = await supabase.from('groups').delete().in('id', groupIds).select();
        if (groupError) throw groupError;
        
        if (!deletedGroups || deletedGroups.length === 0) {
          throw new Error("Deletion blocked by database (RLS). You don't have permission.");
        }
      }

      showToast("All your groups have been deleted.");
      setDeleteAllModalOpen(false);
      fetchGroups();
    } catch (err) {
      showToast("Failed to delete all groups: " + err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6 max-w-4xl mx-auto relative">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Groups</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your communities and collaborations.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setDeleteAllModalOpen(true)}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-5 py-2.5 rounded-xl transition-all font-semibold active:scale-95"
          >
            <Trash2 size={20} />
             All
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all font-semibold shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <Plus size={20} />
            Create Group
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search groups..." 
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:bg-white/10 transition-all"
        />
      </div>

      {/* Groups List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-500 mb-2" size={32} />
          <p className="text-gray-500 font-mono uppercase text-xs tracking-widest">Decrypting Nodes...</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-[2rem]">
          <Users size={48} className="text-gray-800 mb-4" />
          <p className="text-gray-600 font-bold">No groups found.</p>
        </div>
      ) : (
        <div className="space-y-4">
        {filteredGroups.map((group) => {
          const isAdmin = group.created_by === currentUserId;
          const memberCount = group.group_members?.[0]?.count || 1;
          return (
          <div 
            key={group.id} 
              className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-[#0A0A0A] border border-white/5 rounded-2xl p-5 hover:border-blue-500/30 hover:bg-white/[0.02] transition-all cursor-pointer"
          >
            <div className="p-4 bg-blue-500/10 rounded-xl text-blue-400 group-hover:bg-blue-500/20 transition-colors">
              <Users size={28} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-lg font-bold text-white truncate">{group.name}</h3>
                <span className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md border ${
                    group.is_private ? 'border-amber-500/30 text-amber-500 bg-amber-500/5' : 'border-blue-500/30 text-blue-400 bg-blue-500/5'
                }`}>
                    {group.is_private ? <Lock size={10} /> : <Globe size={10} />}
                    {group.is_private ? 'Private' : 'Public'}
                </span>
                  {isAdmin && (
                    <span className="text-[9px] uppercase font-black tracking-widest text-green-500 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">Admin</span>
                  )}
              </div>
              <p className="text-gray-400 text-sm line-clamp-1 group-hover:text-gray-300 transition-colors">
                {group.description}
              </p>
              <div className="mt-2 text-xs text-gray-500 font-medium">
                  {memberCount.toLocaleString()} active members
              </div>
            </div>

              <div className="hidden sm:flex items-center gap-3">
                {isAdmin && (
                  <>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedGroup(group); setInviteModalOpen(true); }}
                      className="px-4 py-2 bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 rounded-xl transition-all text-xs font-bold border border-white/5 flex items-center gap-2"
                    >
                      <UserPlus size={14} /> Invite
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setGroupToDelete(group); setDeleteModalOpen(true); }}
                      className="p-2 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-xl transition-all border border-white/5"
                      title="Delete Group"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              <button className="p-2 text-gray-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all">
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
          );
        })}
      </div>
      )}

      {/* CREATE GROUP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => {
              setIsModalOpen(false);
              setImagePreview(null);
            }}
          />
          
          <div className="relative w-full max-w-lg bg-[#0F0F0F] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Create New Group</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form className="p-6 space-y-5" onSubmit={handleCreateGroup}>
              <div className="flex items-center gap-4">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                <div 
                  onClick={handleImageClick}
                  className={`h-16 w-16 rounded-2xl flex items-center justify-center cursor-pointer transition-all overflow-hidden border ${
                    imagePreview ? 'border-transparent' : 'bg-white/5 border-dashed border-white/20 hover:border-blue-500/50 text-gray-500 hover:text-blue-400'
                  }`}
                >
                  {imagePreview ? (
                    <div className="relative w-full h-full group">
                      <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={16} className="text-white bg-red-500 rounded-full p-0.5" onClick={handleRemoveImage} />
                      </div>
                    </div>
                  ) : (
                    <ImageIcon size={24} />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Group Icon</p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Group Name</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Next.js Masters" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</label>
                  <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this group about?" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button" 
                    onClick={() => setIsPrivateSelection(false)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium ${!isPrivateSelection ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-white/10 bg-white/5 text-gray-400'}`}
                  >
                    <Globe size={16} /> Public
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsPrivateSelection(true)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium ${isPrivateSelection ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-white/10 bg-white/5 text-gray-400'}`}
                  >
                    <Lock size={16} /> Private
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl text-gray-400 font-medium hover:bg-white/5 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={isProcessing} className="flex-1 flex justify-center py-3 px-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50">
                  {isProcessing ? <Loader2 size={20} className="animate-spin" /> : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVITE USER MODAL */}
      {inviteModalOpen && selectedGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setInviteModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-[#0F0F0F] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-blue-600/10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><UserPlus size={18} className="text-blue-500" /> Invite to Group</h2>
              <button onClick={() => setInviteModalOpen(false)} className="text-gray-400 hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <form className="p-6 space-y-5" onSubmit={handleInviteUser}>
              <div>
                <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                  Grant access to <span className="font-bold text-white">{selectedGroup.name}</span>. Enter the exact username of the user you wish to invite.
                </p>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">@</span>
                  <input type="text" required value={inviteUsername} onChange={(e) => setInviteUsername(e.target.value)} placeholder="tech_ninja_99" className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all" />
                </div>
              </div>
              <button type="submit" disabled={isProcessing} className="w-full flex justify-center py-3.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50">
                  {isProcessing ? <Loader2 size={18} className="animate-spin" /> : "Send Invitation"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DELETE GROUP MODAL */}
      {deleteModalOpen && groupToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-[#0F0F0F] border border-white/10 rounded-3xl shadow-2xl p-6 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Delete Group?</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-white">{groupToDelete.name}</span>? This action cannot be undone.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleDeleteGroup} 
                disabled={isProcessing} 
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Delete'}
              </button>
              <button 
                onClick={() => setDeleteModalOpen(false)} 
                className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition border border-white/5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    {/* DELETE ALL GROUPS MODAL */}
    {deleteAllModalOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteAllModalOpen(false)} />
        <div className="relative w-full max-w-sm bg-[#0F0F0F] border border-white/10 rounded-3xl shadow-2xl p-6 text-center animate-in fade-in zoom-in duration-200">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Delete All Groups?</h3>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Are you sure you want to delete <span className="font-bold text-white">ALL</span> groups you created? This action cannot be undone.
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={executeDeleteAllGroups} 
              disabled={isProcessing} 
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Delete All'}
            </button>
            <button 
              onClick={() => setDeleteAllModalOpen(false)} 
              className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition border border-white/5"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}

      {/* TOAST POPUP */}
      {toastMessage && (
        <div className={`fixed bottom-10 right-10 z-[150] flex items-center gap-3 bg-[#0D0D0D] border px-5 py-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-300 max-w-md ${toastType === 'error' ? 'border-red-500/30 text-red-400' : 'border-green-500/30 text-green-400'}`}>
          {toastType === 'error' ? <AlertTriangle size={18} className="text-red-500 shrink-0" /> : <Check size={18} className="text-green-500 shrink-0" />}
          <span className="text-sm font-bold tracking-tight">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}