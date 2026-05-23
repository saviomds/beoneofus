"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Video, VideoOff, Mic, MicOff, Phone, PhoneOff,
  Users, Shield, Loader2,
} from "lucide-react";
import { supabase } from "../../../supabaseClient";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

function RemoteVideo({ stream, displayName }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream ?? null;
  }, [stream]);
  return (
    <div className="relative bg-gray-950 rounded-2xl overflow-hidden aspect-video">
      <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />
      {!stream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500">
          <Loader2 size={18} className="animate-spin" />
          <p className="text-[10px]">Connecting…</p>
        </div>
      )}
      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">
        {displayName}
      </div>
    </div>
  );
}

export default function VideoCall({ project, currentUser }) {
  const [inCall,     setInCall]     = useState(false);
  const [joining,    setJoining]    = useState(false);
  const [audioOn,    setAudioOn]    = useState(true);
  const [videoOn,    setVideoOn]    = useState(true);
  const [audioOnly,  setAudioOnly]  = useState(false);
  const [error,      setError]      = useState(null);
  // { [userId]: { displayName, stream } }
  const [remotes,    setRemotes]    = useState({});

  const localVideoRef  = useRef(null);
  const localStreamRef = useRef(null);
  const channelRef     = useRef(null);
  const peersRef       = useRef({});

  const myId   = currentUser?.id;
  const myName = currentUser?.user_metadata?.username
    ?? currentUser?.email?.split("@")[0]
    ?? "Guest";
  const channelId = `vc:${project.id}`;

  const broadcast = useCallback((event, payload) => {
    channelRef.current?.send({ type: "broadcast", event, payload });
  }, []);

  const makePC = useCallback((remoteId) => {
    peersRef.current[remoteId]?.close();
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    localStreamRef.current?.getTracks().forEach((t) =>
      pc.addTrack(t, localStreamRef.current)
    );

    pc.ontrack = ({ streams }) => {
      setRemotes((prev) => ({
        ...prev,
        [remoteId]: { ...prev[remoteId], stream: streams[0] },
      }));
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) broadcast("vc:ice", { to: remoteId, from: myId, candidate });
    };

    pc.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        delete peersRef.current[remoteId];
        setRemotes((prev) => {
          const next = { ...prev };
          delete next[remoteId];
          return next;
        });
      }
    };

    peersRef.current[remoteId] = pc;
    return pc;
  }, [myId, broadcast]);

  const joinCall = async () => {
    if (!currentUser) return;
    setJoining(true);
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Your browser doesn't support video calls. Try Chrome, Firefox, or Edge.");
      setJoining(false);
      return;
    }

    let stream = null;
    let camAvailable = true;

    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (mediaErr) {
      const name = mediaErr.name;
      if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        // No camera — try mic-only
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          camAvailable = false;
        } catch {
          setError("No microphone found. Connect a microphone and try again.");
          setJoining(false);
          return;
        }
      } else if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        // Camera denied — try mic-only before giving up
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          camAvailable = false;
        } catch {
          setError(
            "Microphone access was denied. Click the lock/camera icon in your browser's address bar, allow microphone access, then try again."
          );
          setJoining(false);
          return;
        }
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        setError("Camera or microphone is in use by another app. Close that app and try again.");
        setJoining(false);
        return;
      } else {
        setError(mediaErr.message || "Could not access camera or microphone.");
        setJoining(false);
        return;
      }
    }

    localStreamRef.current = stream;
    setAudioOnly(!camAvailable);
    setVideoOn(camAvailable);
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    try {
      const ch = supabase.channel(channelId, {
        config: { broadcast: { self: false } },
      });
      channelRef.current = ch;

      ch
        .on("broadcast", { event: "vc:join" }, async ({ payload }) => {
          if (payload.userId === myId) return;
          setRemotes((prev) => ({
            ...prev,
            [payload.userId]: { displayName: payload.displayName, stream: null },
          }));
          const pc = makePC(payload.userId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          broadcast("vc:offer", { to: payload.userId, from: myId, fromName: myName, sdp: offer });
        })
        .on("broadcast", { event: "vc:leave" }, ({ payload }) => {
          peersRef.current[payload.userId]?.close();
          delete peersRef.current[payload.userId];
          setRemotes((prev) => {
            const next = { ...prev };
            delete next[payload.userId];
            return next;
          });
        })
        .on("broadcast", { event: "vc:offer" }, async ({ payload }) => {
          if (payload.to !== myId) return;
          setRemotes((prev) => ({
            ...prev,
            [payload.from]: { displayName: payload.fromName ?? "Teammate", stream: null },
          }));
          const pc = makePC(payload.from);
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          broadcast("vc:answer", { to: payload.from, from: myId, fromName: myName, sdp: answer });
        })
        .on("broadcast", { event: "vc:answer" }, async ({ payload }) => {
          if (payload.to !== myId) return;
          const pc = peersRef.current[payload.from];
          if (pc && pc.signalingState !== "stable") {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          }
        })
        .on("broadcast", { event: "vc:ice" }, async ({ payload }) => {
          if (payload.to !== myId) return;
          try {
            await peersRef.current[payload.from]?.addIceCandidate(
              new RTCIceCandidate(payload.candidate)
            );
          } catch {}
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            broadcast("vc:join", { userId: myId, displayName: myName });
            setInCall(true);
            setJoining(false);
          }
        });
    } catch (err) {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setError(err.message || "Could not connect to the call. Check your internet connection.");
      setJoining(false);
    }
  };

  const leaveCall = useCallback(async () => {
    broadcast("vc:leave", { userId: myId });
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setInCall(false);
    setRemotes({});
    setAudioOn(true);
    setVideoOn(true);
    setAudioOnly(false);
  }, [myId, broadcast]);

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        broadcast("vc:leave", { userId: myId });
        Object.values(peersRef.current).forEach((pc) => pc.close());
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleAudio = () => {
    const t = localStreamRef.current?.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setAudioOn((v) => !v); }
  };

  const toggleVideo = () => {
    const t = localStreamRef.current?.getVideoTracks()[0];
    if (t) { t.enabled = !t.enabled; setVideoOn((v) => !v); }
  };

  const remoteEntries = Object.entries(remotes);

  if (!inCall) {
    return (
      <div className="space-y-5">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
          <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
            <Video size={26} />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">Team Video Call</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
            Start a live video call with your project team. Calls run directly between browsers — no third-party service, everything stays on your platform.
          </p>

          <div className="grid grid-cols-2 gap-2.5 mb-5">
            {[
              { Icon: Video,  label: "HD Video"      },
              { Icon: Mic,    label: "Audio"          },
              { Icon: Shield, label: "Peer-to-Peer"   },
              { Icon: Users,  label: "Up to 4 People" },
            ].map(({ Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2 font-medium"
              >
                <Icon size={13} className="text-blue-500 shrink-0" />
                {label}
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-xl px-4 py-4 mb-4 space-y-3">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">{error}</p>
              {(error.includes("denied") || error.includes("access")) && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-red-600 dark:text-red-500">How to unblock:</p>
                  <ol className="text-xs text-red-600 dark:text-red-400 space-y-1 list-decimal list-inside leading-relaxed">
                    <li>Click the <strong>lock 🔒</strong> or <strong>camera 📷</strong> icon in your browser's address bar</li>
                    <li>Set <strong>Camera</strong> and <strong>Microphone</strong> to <strong>Allow</strong></li>
                    <li>Reload the page, then click Join Call again</li>
                  </ol>
                  <p className="text-[10px] text-red-500 dark:text-red-500 pt-1">
                    On Chrome: address bar → 🔒 → Site settings · Firefox: address bar → 🎥 icon · Safari: Safari menu → Settings for this website
                  </p>
                </div>
              )}
            </div>
          )}

          {!currentUser ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">Sign in to join calls.</p>
          ) : (
            <button
              onClick={joinCall}
              disabled={joining}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-sm shadow-blue-500/20 active:scale-95 disabled:opacity-70"
            >
              {joining ? <Loader2 size={16} className="animate-spin" /> : <Phone size={16} />}
              {joining ? "Starting…" : error ? "Try Again" : "Join Call"}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Live Call</span>
          <span className="text-xs text-gray-400 flex items-center gap-1 ml-1">
            <Users size={11} /> {1 + remoteEntries.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleAudio}
            title={audioOn ? "Mute" : "Unmute"}
            className={`p-2 rounded-xl transition-all ${
              audioOn
                ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
            }`}
          >
            {audioOn ? <Mic size={14} /> : <MicOff size={14} />}
          </button>
          {!audioOnly && (
            <button
              onClick={toggleVideo}
              title={videoOn ? "Turn off camera" : "Turn on camera"}
              className={`p-2 rounded-xl transition-all ${
                videoOn
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
              }`}
            >
              {videoOn ? <Video size={14} /> : <VideoOff size={14} />}
            </button>
          )}
          <button
            onClick={leaveCall}
            className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all ml-1"
          >
            <PhoneOff size={13} /> Leave
          </button>
        </div>
      </div>

      {/* Video grid */}
      <div
        className={`grid gap-3 ${
          remoteEntries.length === 0 ? "grid-cols-1 max-w-sm mx-auto" : "grid-cols-2"
        }`}
      >
        {/* Local */}
        <div className="relative bg-gray-950 rounded-2xl overflow-hidden aspect-video">
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          {(!videoOn || audioOnly) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-900">
              <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                {audioOnly ? <Mic size={20} className="text-blue-400" /> : <VideoOff size={20} className="text-gray-400" />}
              </div>
              {audioOnly && <p className="text-[10px] text-gray-500">Audio only</p>}
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
            You {!audioOn && <MicOff size={9} />}
          </div>
        </div>

        {/* Remotes */}
        {remoteEntries.map(([uid, { displayName, stream }]) => (
          <RemoteVideo key={uid} stream={stream} displayName={displayName} />
        ))}

        {/* Waiting placeholder when alone */}
        {remoteEntries.length === 0 && (
          <div className="hidden" />
        )}
      </div>

      {remoteEntries.length === 0 && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl py-6 text-center">
          <Users size={18} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Waiting for teammates to join…
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
            They open the Calls tab and click Join Call.
          </p>
        </div>
      )}

      <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
        Peer-to-peer · Encrypted · Powered by WebRTC
      </p>
    </div>
  );
}
