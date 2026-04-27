"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { 
  Search, MoreVertical, Phone, Video, Send, 
  Paperclip, CheckCheck, UserPlus, Check, X, 
  Trash2, AlertTriangle, MoreHorizontal, ShieldAlert, ShieldCheck,
  ChevronLeft,
  MessageSquare,
  BadgeCheck,
  Sparkles, Loader2,
  ThumbsUp
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import ProfileContent from "./ProfileContent";
import { useDashboard } from "./DashboardContext";

export default function MessagesContent() {
  const [contacts, setContacts] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const { targetChatUser, setTargetChatUser } = useDashboard();
  const [onlineUsers, setOnlineUsers] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastMessagePreviews, setLastMessagePreviews] = useState({});
  
  // UI & Connection States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUnread, setFilterUnread] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null); 
  const [blockerId, setBlockerId] = useState(null);
  const [activeConnectionId, setActiveConnectionId] = useState(null); // Track the row ID for reliable updates
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false); // Mobile view toggle
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const imageInputRef = useRef(null);
  const [typingUsers, setTypingUsers] = useState({});
  const typingTimeoutsRef = useRef({});
  const lastTypingSentRef = useRef(0);
  
  // Toast State
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const showToast = (msg, type = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 3000);
  };

  // Call States
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const globalCallsRef = useRef(null);

  // Native Video Call Refs
  const peerConnectionRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingOfferRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const ringAudioRef = useRef(null);
  const incomingRingAudioRef = useRef(null);

  const scrollRef = useRef(null);
  const channelRef = useRef(null);

  const activeChatRef = useRef(null);
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      ringAudioRef.current = new Audio("https://actions.google.com/sounds/v1/alarms/phone_ringing.ogg");
      incomingRingAudioRef.current = new Audio("https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg");
    }
  }, []);

  // 1. Initial Setup
  useEffect(() => {
    let isMounted = true;

    const fetchContacts = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uid = session.user.id;
      if (isMounted) setCurrentUserId(uid);

      // Fetch all connections where user is sender or receiver
      const { data: connections } = await supabase
        .from('connections')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`);

      let connectedIds = [];
      if (connections && connections.length > 0) {
        connectedIds = connections.map(c => c.sender_id === uid ? c.receiver_id : c.sender_id);
      }

      if (connectedIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, status, avatar_url, is_verified')
          .in('id', connectedIds);
        
        if (isMounted) {
          setContacts(profiles || []);
          // Keep active chat if it still exists, otherwise pick the first
          setActiveChat(prev => {
            if (prev && profiles?.some(p => p.id === prev.id)) return prev;
            return profiles?.length > 0 ? profiles[0] : null;
          });
        }
      } else {
        if (isMounted) {
          setContacts([]);
          setActiveChat(null);
        }
      }
    };

    fetchContacts();

    // Listen for new connections globally to update the sidebar contacts live
    const channel = supabase.channel('messages-contacts-update')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => {
         fetchContacts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
         fetchContacts();
      })
      .subscribe();

    return () => { 
      isMounted = false;
      supabase.removeChannel(channel); 
    };
  }, []);

  // Handle opening chat directly from outside (e.g., My Network modal)
  useEffect(() => {
    if (targetChatUser) {
      setActiveChat(targetChatUser);
      setContacts(prev => {
        if (!prev.find(c => c.id === targetChatUser.id)) {
          return [targetChatUser, ...prev];
        }
        return prev;
      });
      setTargetChatUser(null);
    }
  }, [targetChatUser, setTargetChatUser]);

  // Real-time Unread Messages & Previews Tracking
  useEffect(() => {
    if (!currentUserId) return;

    const fetchUnreadAndPreviews = async () => {
      const { data } = await supabase
        .from('messages')
        .select('sender_id, receiver_id, is_read, text, image_url, created_at')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false });
        
      const counts = {};
      const previews = {};
      
      if (data) {
        data.forEach(msg => {
          const otherId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;
          
          if (msg.receiver_id === currentUserId && !msg.is_read) {
            if (activeChatRef.current?.id !== msg.sender_id) {
              counts[otherId] = (counts[otherId] || 0) + 1;
            }
          }
          
          if (!previews[otherId]) {
            const isSender = msg.sender_id === currentUserId;
            const prefix = isSender ? 'You: ' : '';
            previews[otherId] = {
              text: prefix + (msg.text || (msg.image_url ? 'Sent an image' : 'New transmission')),
              isSender,
              isRead: msg.is_read
            };
          }
        });
      }
      setUnreadCounts(counts);
      setLastMessagePreviews(previews);
    };

    fetchUnreadAndPreviews();

    const unreadChannel = supabase.channel('messages-unread-update')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUserId}` }, () => {
        fetchUnreadAndPreviews();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `sender_id=eq.${currentUserId}` }, () => {
        fetchUnreadAndPreviews();
      })
      .subscribe();

    return () => { supabase.removeChannel(unreadChannel); };
  }, [currentUserId]);

  // Real-time Online Presence Tracking
  useEffect(() => {
    if (!currentUserId) return;

    const presenceChannel = supabase.channel('online-users', {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        setOnlineUsers(state);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => { supabase.removeChannel(presenceChannel); };
  }, [currentUserId]);

  // 2. Fetch Messages and Connection Logic
  useEffect(() => {
    if (!activeChat || !currentUserId) return;

    const checkConnectionAndFetch = async () => {
      const { data: connection } = await supabase
        .from('connections')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${currentUserId})`)
        .maybeSingle();

      if (!connection) {
        setConnectionStatus('none');
        setBlockerId(null);
        setActiveConnectionId(null);
        setMessages([]);
      } else {
        setActiveConnectionId(connection.id);
        if (connection.status === 'blocked') {
          setConnectionStatus('blocked');
          setBlockerId(connection.blocked_by);
          setMessages([]);
        } else if (connection.status === 'pending') {
          setConnectionStatus(connection.sender_id === currentUserId ? 'waiting' : 'incoming');
          setMessages([]);
        } else {
          setConnectionStatus('accepted');
          setBlockerId(null);
          fetchMessages();
        }
      }
    };

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*, replied_message:reply_to_message_id(*), message_reactions(id, user_id, emoji)')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true });
      setMessages(data || []);

      // Optimistically clear unread count
      setUnreadCounts(prev => ({ ...prev, [activeChat.id]: 0 }));

      // Mark incoming messages as read when the chat is opened
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', currentUserId)
        .eq('sender_id', activeChat.id)
        .eq('is_read', false);
    };

    checkConnectionAndFetch();

    const channelId = `chat-${[currentUserId, activeChat.id].sort().join('-')}`;
    channelRef.current = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => checkConnectionAndFetch())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const newMessage = payload.new;
        if (newMessage.sender_id === activeChat.id || newMessage.receiver_id === activeChat.id) {
          // Fetch the joined replied message data immediately
          const { data } = await supabase.from('messages').select('*, replied_message:reply_to_message_id(*), message_reactions(id, user_id, emoji)').eq('id', newMessage.id).maybeSingle();
          if (data) {
            setMessages((prev) => prev.find(m => m.id === data.id) ? prev : [...prev, data]);
          } else {
            setMessages((prev) => prev.find(m => m.id === newMessage.id) ? prev : [...prev, newMessage]);
          }

          // Mark the message as read immediately if it was sent to us while the chat is actively open
          if (newMessage.receiver_id === currentUserId) {
            await supabase.from('messages').update({ is_read: true }).eq('id', newMessage.id);
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        const updatedMessage = payload.new;
        if (updatedMessage.sender_id === activeChat.id || updatedMessage.receiver_id === activeChat.id) {
           setMessages((prev) => prev.map(m => m.id === updatedMessage.id ? { ...m, is_read: updatedMessage.is_read } : m));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => {
        checkConnectionAndFetch();
      })
      .subscribe();

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [activeChat, currentUserId]);

  // 3. Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, connectionStatus]);

  // 4. Global Calling Setup & Methods
  const cleanupLocalMedia = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setActiveCall(null);
    setIncomingCall(null);
    pendingOfferRef.current = null;
    pendingCandidatesRef.current = [];
  };

  useEffect(() => {
    if (!currentUserId) return;

    // Single global channel for all call signals
    globalCallsRef.current = supabase.channel('global-calls')
      .on('broadcast', { event: 'call_ring' }, async ({ payload }) => {
        if (payload.targetId === currentUserId) {
          const { data } = await supabase.from('profiles').select('username, avatar_url, is_verified').eq('id', payload.callerId).single();
          setIncomingCall({ ...payload, callerInfo: data });
        }
      })
      .on('broadcast', { event: 'call_accept' }, ({ payload }) => {
        if (payload.targetId === currentUserId) {
          setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
        }
      })
      .on('broadcast', { event: 'call_reject' }, ({ payload }) => {
        if (payload.targetId === currentUserId) cleanupLocalMedia();
      })
      .on('broadcast', { event: 'call_end' }, ({ payload }) => {
        if (payload.targetId === currentUserId) cleanupLocalMedia();
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.targetId === currentUserId) {
          setTypingUsers(prev => ({ ...prev, [payload.senderId]: true }));
          if (typingTimeoutsRef.current[payload.senderId]) clearTimeout(typingTimeoutsRef.current[payload.senderId]);
          typingTimeoutsRef.current[payload.senderId] = setTimeout(() => {
            setTypingUsers(prev => ({ ...prev, [payload.senderId]: false }));
          }, 3000);
        }
      })
      .on('broadcast', { event: 'webrtc_offer' }, async ({ payload }) => {
        if (payload.targetId === currentUserId) {
          if (localStreamRef.current && peerConnectionRef.current) {
            try {
              const pc = peerConnectionRef.current;
              await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              globalCallsRef.current?.send({
                type: 'broadcast',
                event: 'webrtc_answer',
                payload: { targetId: payload.senderId, answer }
              });
              pendingCandidatesRef.current.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.error(e)));
              pendingCandidatesRef.current = [];
            } catch(e) { console.error(e); }
          } else {
            pendingOfferRef.current = payload;
          }
        }
      })
      .on('broadcast', { event: 'webrtc_answer' }, async ({ payload }) => {
        if (payload.targetId === currentUserId && peerConnectionRef.current) {
          try { 
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer)); 
            pendingCandidatesRef.current.forEach(c => peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.error(e)));
            pendingCandidatesRef.current = [];
          } catch (e) { console.error(e); }
        }
      })
      .on('broadcast', { event: 'webrtc_ice_candidate' }, async ({ payload }) => {
        if (payload.targetId === currentUserId) {
          if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
            try { await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch (e) { console.error(e); }
          } else {
            pendingCandidatesRef.current.push(payload.candidate);
          }
        }
      })
      .subscribe();

    return () => {
      if (globalCallsRef.current) supabase.removeChannel(globalCallsRef.current);
    };
  }, [currentUserId]);

  const startCall = (isVideo) => {
    if (!activeChat || !currentUserId) return;
    const roomId = `beoneofus-${[currentUserId, activeChat.id].sort().join('-')}-${Date.now()}`;
    
    globalCallsRef.current?.send({
      type: 'broadcast',
      event: 'call_ring',
      payload: { targetId: activeChat.id, callerId: currentUserId, isVideo, roomId }
    });
    
    setActiveCall({ roomId, isVideo, status: 'ringing', peerId: activeChat.id, isCaller: true });
  };

  const acceptCall = () => {
    globalCallsRef.current?.send({ type: 'broadcast', event: 'call_accept', payload: { targetId: incomingCall.callerId } });
    setActiveCall({ roomId: incomingCall.roomId, isVideo: incomingCall.isVideo, status: 'connected', peerId: incomingCall.callerId, isCaller: false });
    
    if (!activeChat || activeChat.id !== incomingCall.callerId) {
      setActiveChat({ id: incomingCall.callerId, ...incomingCall.callerInfo });
    }
    
    setIncomingCall(null);
  };

  const rejectCall = () => {
    globalCallsRef.current?.send({ type: 'broadcast', event: 'call_reject', payload: { targetId: incomingCall.callerId } });
    cleanupLocalMedia();
  };

  const endCall = () => {
    if (activeCall?.peerId) globalCallsRef.current?.send({ type: 'broadcast', event: 'call_end', payload: { targetId: activeCall.peerId } });
    cleanupLocalMedia();
  };

  // Handle Local Media when Call connects
  useEffect(() => {
    let isMounted = true;
    if (activeCall?.status === 'connected') {
      navigator.mediaDevices.getUserMedia({ video: activeCall.isVideo, audio: true })
        .then(async stream => {
          if (!isMounted) return;
          localStreamRef.current = stream;
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
          
          const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
          });
          peerConnectionRef.current = pc;

          stream.getTracks().forEach(track => pc.addTrack(track, stream));

          pc.ontrack = (event) => {
            if (remoteVideoRef.current && event.streams[0]) {
              remoteVideoRef.current.srcObject = event.streams[0];
            }
          };

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              globalCallsRef.current?.send({
                type: 'broadcast',
                event: 'webrtc_ice_candidate',
                payload: { targetId: activeCall.peerId, candidate: event.candidate }
              });
            }
          };

          if (activeCall.isCaller) {
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              globalCallsRef.current?.send({
                type: 'broadcast',
                event: 'webrtc_offer',
                payload: { targetId: activeCall.peerId, senderId: currentUserId, offer }
              });
            } catch(e) { console.error(e); }
          } else {
            if (pendingOfferRef.current) {
              const payload = pendingOfferRef.current;
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                globalCallsRef.current?.send({
                  type: 'broadcast',
                  event: 'webrtc_answer',
                  payload: { targetId: payload.senderId, answer }
                });
                pendingCandidatesRef.current.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.error(e)));
                pendingCandidatesRef.current = [];
              } catch(e) { console.error(e); }
              pendingOfferRef.current = null;
            }
          }
        })
        .catch(err => {
          console.error("Media access denied:", err);
          showToast("Camera or Microphone access is required for calls.", "error");
          endCall();
        });
    }
    return () => { isMounted = false; };
  }, [activeCall?.status, activeCall?.isVideo, activeCall?.peerId, activeCall?.isCaller, currentUserId]);

  // Outgoing Call Ringing Sound
  useEffect(() => {
    if (activeCall?.status === 'ringing' && ringAudioRef.current) {
      if (localStorage.getItem('beoneofus_muted') !== 'true') {
        ringAudioRef.current.loop = true;
        ringAudioRef.current.play().catch(e => console.warn("Audio playback blocked (requires user interaction first)"));
      }
    } else if (ringAudioRef.current) {
      ringAudioRef.current.pause();
      ringAudioRef.current.currentTime = 0;
    }
  }, [activeCall?.status]);

  // Incoming Call Ringing Sound
  useEffect(() => {
    if (incomingCall && incomingRingAudioRef.current) {
      if (localStorage.getItem('beoneofus_muted') !== 'true') {
        incomingRingAudioRef.current.loop = true;
        incomingRingAudioRef.current.play().catch(e => console.warn("Audio playback blocked (requires user interaction first)"));
      }
    } else if (incomingRingAudioRef.current) {
      incomingRingAudioRef.current.pause();
      incomingRingAudioRef.current.currentTime = 0;
    }
    // Ensure sound stops if component unmounts while ringing
    return () => { if (incomingRingAudioRef.current) incomingRingAudioRef.current.pause(); };
  }, [incomingCall]);

  // Call Duration Timer
  useEffect(() => {
    let timerInterval;
    if (activeCall?.status === 'connected') {
      setCallDuration(0); // Reset on new call
      timerInterval = setInterval(() => {
        setCallDuration(prevDuration => prevDuration + 1);
      }, 1000);
    }
    return () => {
      clearInterval(timerInterval);
    };
  }, [activeCall?.status]);

  // 5. Connection Handlers
  const handleSendRequest = async () => {
    const { error } = await supabase.from('connections').insert({
      sender_id: currentUserId,
      receiver_id: activeChat.id,
      status: 'pending'
    });
    
    if (error) {
      if (error.code === '23503') {
        showToast("This user no longer exists.", "error");
        setContacts(prev => prev.filter(c => c.id !== activeChat.id));
        setActiveChat(null);
      } else {
        showToast("Failed to send request: " + error.message, "error");
      }
      return;
    }

    setConnectionStatus('waiting'); // Optimistic UI update
    await supabase.from('notifications').insert({
      receiver_id: activeChat.id,
      actor_id: currentUserId,
      type: 'connection_request',
      content: 'wants to connect'
    });
  };

  const handleAcceptRequest = async () => {
    if (!activeConnectionId) return;
    const { error } = await supabase.from('connections').update({ status: 'accepted' }).eq('id', activeConnectionId);
    
    if (!error) {
      setConnectionStatus('accepted'); // Optimistic UI update
      await supabase.from('notifications').insert({
        receiver_id: activeChat.id,
        actor_id: currentUserId,
        type: 'handshake',
        content: 'accepted your connection request'
      });
    }
  };

  // 6. BLOCK / UNBLOCK LOGIC (Fixed for persistence)
  const handleBlockUser = async () => {
    if (!activeConnectionId || !currentUserId) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('connections')
        .update({ 
          status: 'blocked', 
          blocked_by: currentUserId 
        })
        .eq('id', activeConnectionId);
      
      if (error) throw error;
      
      setShowBlockConfirm(false);
      setShowMoreMenu(false);
    } catch (error) { 
        console.error("Block error:", error.message);
        showToast("System failure: Could not sever link.", "error");
    } finally { setIsProcessing(false); }
  };

  const handleUnblockUser = async () => {
    if (!activeConnectionId || !currentUserId) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('connections')
        .update({ 
          status: 'accepted', 
          blocked_by: null 
        })
        .eq('id', activeConnectionId)
        .eq('blocked_by', currentUserId);
      
      if (error) throw error;
      setShowMoreMenu(false);
    } catch (error) { 
        console.error("Unblock error:", error.message);
    } finally { setIsProcessing(false); }
  };

  // --- AI SUGGEST REPLY LOGIC ---
  const handleSuggestReply = async () => {
    if (isSuggesting || !activeChat) return;

    // Find the last message sent by the other user to gain context
    const lastMessage = [...messages].reverse().find(m => m.sender_id === activeChat.id);
    const contextText = lastMessage ? lastMessage.text : null;
    
    const prompt = contextText 
      ? `Draft a very brief, friendly, and natural direct message reply (1-2 sentences maximum) to this message from a developer: "${contextText}". Return ONLY the exact message text, without any quotes, filler, or intro.`
      : `Draft a friendly, very brief initial greeting (1 sentence) to another developer to start a chat. Return ONLY the exact message text, without any quotes.`;

    setIsSuggesting(true);
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error("AI API not active. Please restart your dev server."); }
      if (!res.ok) throw new Error(data.error || "Failed to fetch response");

      const cleanReply = data.message.content.replace(/^["']|["']$/g, '').trim();
      setInputValue(cleanReply);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setIsSuggesting(false);
    }
  };

  // --- HANDLE REACTION ---
  const handleReaction = async (messageId, emoji) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;
    
    const existing = msg.message_reactions?.find(r => r.user_id === currentUserId && r.emoji === emoji);
    
    // Optimistic UI Update: Instantly update the local state
    setMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        const reactions = m.message_reactions || [];
        if (existing) {
          return { ...m, message_reactions: reactions.filter(r => r.id !== existing.id) };
        } else {
          return { ...m, message_reactions: [...reactions, { id: `temp-${Date.now()}`, message_id: messageId, user_id: currentUserId, emoji }] };
        }
      }
      return m;
    }));

    try {
      if (existing) {
         await supabase.from('message_reactions').delete().eq('id', existing.id);
      } else {
         const { error } = await supabase.from('message_reactions').insert({ message_id: messageId, user_id: currentUserId, emoji });
         if (error) throw error;
      }
    } catch (err) {
      showToast("Reaction failed. Make sure the 'message_reactions' table exists.", "error");
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    const now = Date.now();
    if (now - lastTypingSentRef.current > 1500) {
      globalCallsRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: { targetId: activeChat.id, senderId: currentUserId }
      });
      lastTypingSentRef.current = now;
    }
  };

  // 7. Send Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (connectionStatus !== 'accepted') return;
    
    const msgText = inputValue;
    const imageToUpload = imageFile;
    const replyToId = replyingTo?.id;

    if (!msgText.trim() && !imageToUpload) return;

    const optimisticId = Date.now(); 
    setMessages((prev) => [...prev, { id: optimisticId, sender_id: currentUserId, receiver_id: activeChat.id, text: msgText, image_url: imagePreview, replied_message: replyingTo, created_at: new Date().toISOString(), isSending: true }]);
    
    setLastMessagePreviews(prev => ({ 
      ...prev, 
      [activeChat.id]: {
        text: `You: ${msgText.trim() || (imageToUpload ? 'Sent an image' : 'New transmission')}`,
        isSender: true,
        isRead: false
      }
    }));

    setInputValue("");
    setImageFile(null);
    setImagePreview(null);
    setReplyingTo(null);
    if (imageInputRef.current) imageInputRef.current.value = "";

    try {
      let imageUrl = null;
      if (imageToUpload) {
        const fileExt = imageToUpload.name.split('.').pop();
        const fileName = `msg-${Date.now()}.${fileExt}`;
        const filePath = `${currentUserId}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('chat_images').upload(filePath, imageToUpload);
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage.from('chat_images').getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }

      const { data: insertedMsg, error } = await supabase.from('messages').insert({ 
        sender_id: currentUserId, 
        receiver_id: activeChat.id, 
        text: msgText.trim() || "",
        image_url: imageUrl,
        reply_to_message_id: replyToId
      }).select().single();
      if (error) throw error;

      setMessages((prev) => {
        if (prev.some(m => m.id === insertedMsg.id)) {
          return prev.filter(m => m.id !== optimisticId);
        }
        return prev.map(m => m.id === optimisticId ? { ...m, id: insertedMsg.id, isSending: false } : m);
      });

      // Generate a notification for the recipient
      await supabase.from('notifications').insert({
        receiver_id: activeChat.id,
        actor_id: currentUserId,
        type: 'message',
        content: msgText.trim() ? (msgText.trim().length > 100 ? msgText.trim().substring(0, 100) + '...' : msgText.trim()) : 'Sent an image'
      });
    } catch (err) {
      setMessages((prev) => prev.filter(m => m.id !== optimisticId));
      showToast("Failed to send message: " + err.message, "error");
    }
  };

  if (!currentUserId) return <div className="p-10 text-gray-500 font-bold uppercase text-xs text-center">Node Unauthorized</div>;

  // Handle Image attach
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (e) => {
    e.stopPropagation();
    setImageFile(null);
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUnread = filterUnread ? unreadCounts[c.id] > 0 : true;
    return matchesSearch && matchesUnread;
  });

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  return (
    <div className="w-full flex h-[calc(100dvh-180px)] md:h-[calc(100vh-180px)] bg-transparent overflow-hidden relative">
      
      {/* BLOCK MODAL */}
      {showBlockConfirm && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 w-full max-w-sm rounded-2xl p-8 shadow-xl text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-orange-50 border border-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Sever Connection?</h3>
            <p className="text-gray-600 text-sm mb-8 leading-relaxed">Block @{activeChat.username}. Connection will be terminated until you re-authorize this node.</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleBlockUser} disabled={isProcessing} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition">{isProcessing ? 'Terminating...' : 'Confirm Block'}</button>
              <button onClick={() => setShowBlockConfirm(false)} className="w-full bg-gray-50 text-gray-700 font-bold py-3 rounded-xl transition border border-gray-200 hover:bg-gray-100">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar: Contacts */}
      <div className={`w-full md:w-64 lg:w-72 border-r-0 md:border-r border-gray-200 flex-col md:pr-2 shrink-0 ${isMobileChatOpen ? 'hidden md:flex' : 'flex'}`}>
        <div className="pb-4 px-2">
          <h2 className="text-2xl font-black text-gray-900 tracking-tighter mb-3">Messages</h2>
          <div className="flex items-center p-1 bg-gray-100 rounded-xl mb-3">
            <button onClick={() => setFilterUnread(false)} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${!filterUnread ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>All</button>
            <button onClick={() => setFilterUnread(true)} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-1.5 ${filterUnread ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
              Unread
              {Object.values(unreadCounts).some(count => count > 0) && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
            </button>
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={14} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search connections..." 
              className="w-full bg-white border border-gray-200 hover:border-gray-300 rounded-xl py-2 pl-9 pr-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" 
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar px-2 pb-2">
          {filteredContacts.length === 0 && (
            <div className="text-center text-xs text-gray-500 font-bold mt-10 px-4 animate-in fade-in">
              {filterUnread ? "No unread messages." : "No connections found. Follow nodes to open channels."}
            </div>
          )}
          {filteredContacts.map((contact, index) => (
            <div 
              key={contact.id} 
              onClick={() => { setActiveChat(contact); setShowMoreMenu(false); setIsMobileChatOpen(true); }} 
              className={`group flex items-center gap-3 p-3 cursor-pointer transition-all duration-300 rounded-2xl border animate-in fade-in slide-in-from-left-4 ${activeChat?.id === contact.id ? 'bg-blue-50 border-blue-200 shadow-md scale-[1.02] z-10 relative' : 'bg-white hover:bg-gray-50 border-gray-100 hover:border-gray-200 hover:shadow-sm'}`}
              style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' }}
            >
              <div 
                className={`relative w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all overflow-hidden shrink-0 border-2 ${activeChat?.id === contact.id ? 'border-blue-300 bg-blue-100 text-blue-600' : 'border-transparent bg-gray-100 text-gray-500 group-hover:border-blue-100 group-hover:text-blue-500'}`}
                onClick={(e) => { e.stopPropagation(); setSelectedUserId(contact.id); }}
                title={`View @${contact.username}'s Profile`}
              >
                {contact.avatar_url ? (
                  <Image src={contact.avatar_url} alt="avatar" fill sizes="48px" className="object-cover" />
                ) : (
                  contact.username[0].toUpperCase()
                )}
                {Object.keys(onlineUsers).includes(contact.id) && (
                   <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h4 className={`text-sm font-bold truncate transition-colors flex items-center gap-1 ${activeChat?.id === contact.id ? 'text-blue-700' : 'text-gray-900 group-hover:text-blue-600'}`}>
                    {contact.username}
                    {contact.is_verified && <BadgeCheck size={14} className={activeChat?.id === contact.id ? 'text-blue-600' : 'text-blue-500'} fill="currentColor" stroke="white" />}
                  </h4>
                  {unreadCounts[contact.id] > 0 && (
                    <span className="text-[9px] font-black text-white bg-blue-600 px-1.5 py-0.5 rounded-md shrink-0 animate-pulse shadow-sm shadow-blue-600/30">{unreadCounts[contact.id]} NEW</span>
                  )}
                </div>
                <div className="flex items-center gap-1 min-w-0">
                   <p className={`text-xs truncate flex-1 ${typingUsers[contact.id] ? 'text-blue-500 italic font-bold' : unreadCounts[contact.id] > 0 ? 'text-blue-600 font-bold' : 'text-gray-500 font-medium'}`}>
                     {typingUsers[contact.id] ? (
                       'typing...'
                     ) : (
                       lastMessagePreviews[contact.id]?.text || (typeof lastMessagePreviews[contact.id] === 'string' ? lastMessagePreviews[contact.id] : (Object.keys(onlineUsers).includes(contact.id) ? 'Online now' : 'Tap to open transmission'))
                     )}
                   </p>
                   {!typingUsers[contact.id] && lastMessagePreviews[contact.id]?.isSender && (
                     lastMessagePreviews[contact.id].isRead ? (
                       <CheckCheck size={14} className="text-blue-500 shrink-0" />
                     ) : (
                       <Check size={14} className="text-gray-400 shrink-0" />
                     )
                   )}
                </div>
              </div>
              {unreadCounts[contact.id] > 0 && (
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] shrink-0"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex-col min-w-0 min-h-0 md:pl-4 md:mr-2 ${!isMobileChatOpen ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            <div className="pb-3 pt-2 md:pt-0 border-b border-gray-200 flex items-center justify-between relative overflow-visible shrink-0 z-10">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsMobileChatOpen(false)} className="md:hidden p-1.5 -ml-1.5 text-gray-500 hover:text-gray-900 transition-colors">
                  <ChevronLeft size={22} />
                </button>
                <div 
                  className="relative w-9 h-9 rounded-full bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-600 font-bold cursor-pointer hover:bg-violet-100 transition-colors overflow-hidden shrink-0"
                  onClick={() => setSelectedUserId(activeChat.id)}
                  title={`View @${activeChat.username}'s Profile`}
                >
                  {activeChat.avatar_url ? (
                    <Image src={activeChat.avatar_url} alt="avatar" fill sizes="36px" className="object-cover" />
                  ) : (
                    activeChat.username[0].toUpperCase()
                  )}
                </div>
                <div className="cursor-pointer group" onClick={() => setSelectedUserId(activeChat.id)}>
                  <h3 className="text-sm font-bold text-gray-900 leading-tight group-hover:text-violet-600 transition-colors flex items-center gap-1">
                    {activeChat.username}
                    {activeChat.is_verified && <BadgeCheck size={14} className="text-violet-500" fill="currentColor" stroke="white" />}
                  </h3>
                  <div className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 ${connectionStatus === 'blocked' ? 'bg-red-500' : Object.keys(onlineUsers).includes(activeChat.id) ? 'bg-green-500 animate-pulse' : 'bg-gray-300'} rounded-full`}></div>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">
                      {connectionStatus === 'blocked' ? 'Severed' : Object.keys(onlineUsers).includes(activeChat.id) ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1 text-gray-500 relative">
               
                <div className="relative">
                  <button onClick={() => setShowMoreMenu(!showMoreMenu)} className={`p-1.5 transition-colors ${showMoreMenu ? 'text-gray-900' : 'hover:text-gray-900'}`}><MoreHorizontal size={18} /></button>
                  {showMoreMenu && (
                    <div className="absolute top-10 right-0 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-[150] py-2 animate-in fade-in slide-in-from-top-2">
                      {connectionStatus === 'blocked' && blockerId === currentUserId ? (
                         <button onClick={handleUnblockUser} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-green-600 hover:bg-green-50 transition-all font-bold"><ShieldCheck size={14} /> UNBLOCK NODE</button>
                      ) : (
                        <button onClick={() => setShowBlockConfirm(true)} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-orange-600 hover:bg-orange-50 transition-all font-bold"><ShieldAlert size={14} /> BLOCK NODE</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-4 no-scrollbar scroll-smooth flex flex-col relative z-0">
              {connectionStatus === 'accepted' ? (
                <>
                {messages.map((msg) => {
                  const hasLiked = msg.message_reactions?.some(r => r.user_id === currentUserId && r.emoji === '👍');
                  return (
                  <div key={msg.id} className={`flex gap-2 group ${msg.sender_id === currentUserId ? "justify-end" : "justify-start"}`}>
                    {msg.sender_id !== currentUserId && (
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-40 sm:group-hover:opacity-100 transition-all px-2">
                        <button onClick={() => handleReaction(msg.id, '👍')} className={`p-1.5 rounded-lg transition-all hover:bg-gray-100 ${hasLiked ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'}`} title="Like">
                          <ThumbsUp size={14} className={hasLiked ? "fill-current" : ""} />
                        </button>
                        <button onClick={() => setReplyingTo(msg)} className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-gray-100 transition-all" title="Reply">
                          <MessageSquare size={14} />
                        </button>
                      </div>
                    )}
                    <div className={`max-w-[85%] ${msg.sender_id === currentUserId ? "text-right" : "text-left"}`}>
                      <div className={`inline-block p-1 rounded-2xl text-[13px] break-words text-left shadow-sm ${msg.sender_id === currentUserId ? "bg-blue-600 text-white rounded-tr-sm" : "bg-white text-gray-800 border border-gray-200 rounded-tl-sm"} ${msg.isSending ? "opacity-70" : "opacity-100"}`}>
                        <div className="px-3 pt-1.5 pb-2">
                          {msg.replied_message && (
                            <div className="border-l-2 border-blue-300 pl-2 mb-2 text-xs opacity-80">
                              <p className="font-bold text-current flex items-center gap-1">
                                @{msg.replied_message.sender_id === currentUserId ? 'You' : activeChat.username}
                                {msg.replied_message.sender_id !== currentUserId && activeChat.is_verified && <BadgeCheck size={10} className="text-blue-500" fill="currentColor" stroke="white" />}
                              </p>
                              <p className="text-current/80 line-clamp-1">{msg.replied_message.text || 'Image'}</p>
                            </div>
                          )}
                          {msg.image_url && (
                            <div className="relative w-full min-w-[200px] aspect-video rounded-lg overflow-hidden my-2 cursor-pointer" onClick={() => window.open(msg.image_url, '_blank')}>
                              <Image src={msg.image_url} alt="attachment" fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover" />
                            </div>
                          )}
                          {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                        </div>
                      </div>
                      
                      {msg.message_reactions && msg.message_reactions.filter(r => r.emoji === '👍').length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1 relative z-10 ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}>
                          <button 
                            onClick={() => handleReaction(msg.id, '👍')}
                            className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all shadow-sm ${hasLiked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                          >
                            <ThumbsUp size={10} className={hasLiked ? "fill-current text-white" : "text-gray-400"} /> 
                            <span>{msg.message_reactions.filter(r => r.emoji === '👍').length}</span>
                          </button>
                        </div>
                      )}

                      <div className={`mt-1 flex items-center gap-1.5 text-[10px] text-gray-600 px-1 ${msg.sender_id === currentUserId ? "justify-end" : "justify-start"}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {msg.sender_id === currentUserId && (
                          <span className="flex items-center gap-0.5">
                            {msg.isSending ? (
                              <span className="text-gray-400 italic">Sending...</span>
                            ) : msg.is_read ? (
                              <><CheckCheck size={14} className="text-blue-500" /><span className="text-blue-500 font-bold">Seen</span></>
                            ) : (
                              <><Check size={14} className="text-gray-400" /><span className="text-gray-500 font-medium">Delivered</span></>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    {msg.sender_id === currentUserId && (
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-40 sm:group-hover:opacity-100 transition-all px-2">
                        <button onClick={() => handleReaction(msg.id, '👍')} className={`p-1.5 rounded-lg transition-all hover:bg-gray-100 ${hasLiked ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'}`} title="Like">
                          <ThumbsUp size={14} className={hasLiked ? "fill-current" : ""} />
                        </button>
                        <button onClick={() => setReplyingTo(msg)} className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-gray-100 transition-all" title="Reply">
                          <MessageSquare size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {typingUsers[activeChat.id] && (
                <div className="flex gap-2 group justify-start animate-in fade-in slide-in-from-bottom-2">
                  <div className="bg-gray-100 border border-gray-200 rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-sm w-max">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              )}
              </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                  {connectionStatus === 'blocked' ? (
                    <>
                      <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-full flex items-center justify-center text-red-600"><ShieldAlert size={32} /></div>
                      <p className="text-gray-500 text-sm font-bold uppercase tracking-tighter">Connection Severed</p>
                      {blockerId === currentUserId ? (
                        <button onClick={handleUnblockUser} className="text-violet-500 text-xs font-black uppercase hover:underline">Re-authorize Link</button>
                      ) : (
                        <p className="text-gray-500 text-xs italic font-mono">Channel locked by peer user.</p>
                      )}
                    </>
                  ) : connectionStatus === 'none' ? (
                    <><div className="w-16 h-16 bg-violet-50 border border-violet-100 rounded-full flex items-center justify-center text-violet-600"><UserPlus size={32} /></div><p className="text-gray-500 text-sm font-bold uppercase tracking-tighter">Transmission blocked</p><button onClick={handleSendRequest} className="bg-violet-600 hover:bg-violet-500 text-white px-8 py-3 rounded-xl font-bold">Send Request</button></>
                  ) : connectionStatus === 'waiting' ? (
                    <><div className="w-16 h-16 bg-gray-50 border border-gray-200 rounded-full flex items-center justify-center text-gray-400 animate-pulse"><Send size={32} /></div><p className="text-gray-500 text-xs italic font-mono uppercase tracking-tighter">Syncing... waiting for peer authorization.</p></>
                  ) : (
                    <><div className="w-16 h-16 bg-green-50 border border-green-100 rounded-full flex items-center justify-center text-green-600"><Check size={32} /></div><p className="text-gray-900 text-sm font-black tracking-tight uppercase">Connection Request Detected</p><div className="flex gap-3"><button onClick={handleAcceptRequest} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all"><Check size={18} /> Accept</button><button onClick={() => { supabase.from('connections').delete().eq('id', activeConnectionId); setConnectionStatus('none'); }} className="bg-white border border-gray-300 hover:bg-red-50 text-gray-700 hover:text-red-600 px-6 py-2.5 rounded-xl font-bold transition-all">Ignore</button></div></>
                  )}
                </div>
              )}
            </div>

            <div className={`p-3 md:p-0 md:pt-3 bg-white md:bg-transparent border-t border-gray-200 md:border-transparent shrink-0 w-full z-20 transition-all duration-500 ${connectionStatus === 'accepted' ? 'opacity-100 translate-y-0' : 'opacity-10 translate-y-4 pointer-events-none'}`}>
              {replyingTo && (
                <div className="bg-gray-100 border border-gray-200 border-b-0 rounded-t-xl px-4 py-2 text-xs flex justify-between items-center animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="min-w-0">
                    <p className="text-gray-500 flex items-center gap-1">Replying to <span className="font-bold text-blue-600 flex items-center gap-1">
                      @{replyingTo.sender_id === currentUserId ? 'You' : activeChat.username}
                      {replyingTo.sender_id !== currentUserId && activeChat.is_verified && <BadgeCheck size={12} className="text-blue-500" fill="currentColor" stroke="white" />}
                    </span></p>
                    <p className="text-gray-500 truncate">{replyingTo.text || 'Image'}</p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="p-1 text-gray-500 hover:text-gray-900"><X size={16} /></button>
                </div>
              )}
              {imagePreview && (
                <div className="bg-gray-100 border border-gray-200 border-b-0 rounded-t-xl p-2 flex animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                    <Image src={imagePreview} alt="preview" fill sizes="64px" className="object-cover" />
                    <button onClick={handleRemoveImage} className="absolute top-1 right-1 bg-white/80 text-gray-900 rounded-full p-0.5"><X size={12} /></button>
                  </div>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-2 bg-white border border-gray-300 rounded-full p-1.5 pl-3 sm:pl-4 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-md w-full">
                <input type="file" ref={imageInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                <button 
                  type="button" 
                  onClick={handleSuggestReply} 
                  disabled={isSuggesting} 
                  className="text-gray-400 hover:text-violet-600 transition-colors p-2 disabled:opacity-50 shrink-0"
                  title="Suggest AI Reply"
                >
                  {isSuggesting ? <Loader2 size={18} className="animate-spin text-violet-500" /> : <Sparkles size={18} />}
                </button>
                <button type="button" onClick={() => imageInputRef.current?.click()} className="text-gray-400 hover:text-blue-600 transition-colors p-2 shrink-0">
                  <Paperclip size={18} />
                </button>
                <input value={inputValue} onChange={handleInputChange} placeholder={connectionStatus === 'accepted' ? `Message @${activeChat.username}...` : 'Channel Locked'} className="flex-1 min-w-0 bg-transparent border-none focus:outline-none text-base md:text-sm text-gray-900 py-2" />
                <button type="submit" className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-full transition-all shadow-lg shadow-blue-600/20"><Send size={16} strokeWidth={3} /></button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600 text-xs font-black uppercase tracking-[4px] italic animate-pulse">Waiting for selection...</div>
        )}
      </div>

      {/* USER PROFILE MODAL */}
      {selectedUserId && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setSelectedUserId(null)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar z-10 bg-white rounded-[2rem] border border-gray-200 shadow-xl">
            <button 
              onClick={() => setSelectedUserId(null)} 
              className="absolute top-6 right-6 z-[260] p-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-full text-gray-500 transition-colors"
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
      {toastMessage && (
        <div className={`fixed bottom-10 right-10 z-[300] flex items-center gap-3 bg-white border px-5 py-3 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-8 duration-300 max-w-md ${toastType === 'error' ? 'border-red-200 text-red-600' : 'border-green-200 text-green-600'}`}>
          {toastType === 'error' ? <AlertTriangle size={18} className="text-red-500 shrink-0" /> : <Check size={18} className="text-green-500 shrink-0" />}
          <span className="text-sm font-bold tracking-tight">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}