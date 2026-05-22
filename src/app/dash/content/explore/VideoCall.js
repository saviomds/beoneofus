"use client";
import { useState } from "react";
import { Video, Mic, Shield, ExternalLink, Phone, PhoneOff } from "lucide-react";

export default function VideoCall({ project, currentUser }) {
  const [inCall,   setInCall]   = useState(false);
  const [loading,  setLoading]  = useState(false);

  // Sanitise project ID to a safe Jitsi room name (alphanumeric + hyphens only)
  const roomId   = `beoneofus-${(project.id ?? "workspace").toString().replace(/[^a-zA-Z0-9]/g, "-").slice(0, 32)}`;
  const jitsiUrl = `https://meet.jit.si/${roomId}`;

  const displayName = currentUser?.user_metadata?.username
    ?? currentUser?.email?.split("@")[0]
    ?? "Guest";

  const handleJoin = () => {
    setLoading(true);
    setTimeout(() => { setInCall(true); setLoading(false); }, 600);
  };

  if (inCall) {
    return (
      <div className="space-y-4">
        {/* Call header */}
        <div className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Call in Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={jitsiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              <ExternalLink size={13} /> Open in new tab
            </a>
            <button
              onClick={() => setInCall(false)}
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
            >
              <PhoneOff size={13} /> Leave
            </button>
          </div>
        </div>

        {/* Jitsi iframe */}
        <div
          className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800"
          style={{ height: "520px" }}
        >
          <iframe
            src={`${jitsiUrl}#userInfo.displayName="${encodeURIComponent(displayName)}"&config.startWithAudioMuted=false&config.startWithVideoMuted=false`}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="w-full h-full border-0"
            title="Project Video Call"
          />
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
          <Shield size={12} />
          Powered by Jitsi Meet (end-to-end encrypted). Room:{" "}
          <code className="font-mono text-blue-600 dark:text-blue-400">{roomId}</code>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
          <Video size={26} />
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">Team Video Call</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
          Start or join a video/audio call with your project team. The room is dedicated to this project and persists between sessions. No account or install required.
        </p>

        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {[
            { Icon: Video,        label: "HD Video"          },
            { Icon: Mic,          label: "Audio"             },
            { Icon: Shield,       label: "Encrypted"         },
            { Icon: ExternalLink, label: "No Install"        },
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

        <button
          onClick={handleJoin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-sm shadow-blue-500/20 active:scale-95 disabled:opacity-70"
        >
          {loading
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Phone size={16} />
          }
          {loading ? "Starting…" : "Join Call"}
        </button>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <strong className="text-gray-700 dark:text-gray-300">Room ID:</strong>{" "}
          <code className="font-mono text-blue-600 dark:text-blue-400">{roomId}</code>
          <br />
          <span className="mt-1 block">
            Share this room ID with teammates so they can join from outside the platform via{" "}
            <code className="font-mono">meet.jit.si/{roomId}</code>.
          </span>
        </p>
      </div>
    </div>
  );
}
