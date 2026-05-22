"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Code2, Copy, Check, Wifi, WifiOff, Circle } from "lucide-react";
import { supabase } from "../../../supabaseClient";

const LANGUAGES = [
  { value: "javascript", label: "JavaScript", ext: "js"   },
  { value: "typescript", label: "TypeScript", ext: "ts"   },
  { value: "python",     label: "Python",     ext: "py"   },
  { value: "rust",       label: "Rust",       ext: "rs"   },
  { value: "go",         label: "Go",         ext: "go"   },
  { value: "cpp",        label: "C++",        ext: "cpp"  },
  { value: "java",       label: "Java",       ext: "java" },
  { value: "html",       label: "HTML",       ext: "html" },
  { value: "css",        label: "CSS",        ext: "css"  },
  { value: "sql",        label: "SQL",        ext: "sql"  },
  { value: "bash",       label: "Shell",      ext: "sh"   },
];

const STARTER = {
  javascript: `// Live Code — keystrokes sync in real time\n\nfunction greet(name) {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(greet("beoneofus"));`,
  typescript: `// TypeScript — Live Collaboration\n\ninterface User {\n  name: string;\n  role: "owner" | "contributor" | "viewer";\n}\n\nconst greet = (user: User): string =>\n  \`Hello, \${user.name} [\${user.role}]\`;`,
  python:     `# Python — Live Collaboration\n\ndef greet(name: str) -> str:\n    return f"Hello, {name}!"\n\nif __name__ == "__main__":\n    print(greet("beoneofus"))`,
  rust:       `// Rust — Live Collaboration\n\nfn main() {\n    let name = "beoneofus";\n    println!("Hello, {}!", name);\n}`,
  go:         `// Go — Live Collaboration\n\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, beoneofus!")\n}`,
};

export default function LiveCode({ project, currentUser }) {
  const [code, setCode]               = useState(STARTER.javascript);
  const [language, setLanguage]       = useState("javascript");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [copied, setCopied]           = useState(false);
  const [remoteEditing, setRemoteEditing] = useState(false);
  const [remoteEditor, setRemoteEditor]   = useState(null);

  const channelRef       = useRef(null);
  const debounceRef      = useRef(null);
  const remoteEditTimer  = useRef(null);
  const myUsername       = currentUser?.user_metadata?.username
    ?? currentUser?.email?.split("@")[0]
    ?? "Guest";

  useEffect(() => {
    const key = currentUser?.id ?? `anon-${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel(`project:code:${project.id}`, {
      config: {
        broadcast: { self: false },
        presence:  { key },
      },
    });

    channel
      .on("broadcast", { event: "code_change" }, ({ payload }) => {
        if (payload?.code     !== undefined) setCode(payload.code);
        if (payload?.language !== undefined) setLanguage(payload.language);
        setRemoteEditing(true);
        setRemoteEditor(payload?.username ?? "Teammate");
        clearTimeout(remoteEditTimer.current);
        remoteEditTimer.current = setTimeout(() => {
          setRemoteEditing(false);
          setRemoteEditor(null);
        }, 1800);
      })
      .on("presence", { event: "sync" }, () => {
        setOnlineUsers(Object.values(channel.presenceState()).flat());
      })
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") {
          channel.track({ user_id: currentUser?.id ?? null, username: myUsername });
        }
      });

    channelRef.current = channel;
    return () => {
      clearTimeout(debounceRef.current);
      clearTimeout(remoteEditTimer.current);
      supabase.removeChannel(channel);
    };
  }, [project.id, currentUser, myUsername]);

  const broadcast = useCallback((newCode, newLang) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      channelRef.current?.send({
        type:    "broadcast",
        event:   "code_change",
        payload: { code: newCode, language: newLang, username: myUsername, userId: currentUser?.id },
      });
    }, 120);
  }, [currentUser, myUsername]);

  const handleCodeChange = (e) => {
    const v = e.target.value;
    setCode(v);
    broadcast(v, language);
  };

  const handleLangChange = (lang) => {
    const starter = STARTER[lang];
    setLanguage(lang);
    if (starter) {
      setCode(starter);
      broadcast(starter, lang);
    } else {
      broadcast(code, lang);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const langMeta   = LANGUAGES.find((l) => l.value === language) ?? LANGUAGES[0];
  const lineCount  = code.split("\n").length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3">
        {/* Connection */}
        <span className={`flex items-center gap-1.5 text-xs font-semibold ${
          isConnected ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"
        }`}>
          {isConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
          {isConnected ? "Live" : "Connecting…"}
        </span>

        {/* Online avatars */}
        {onlineUsers.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {onlineUsers.slice(0, 6).map((u, i) => (
                <div
                  key={i}
                  title={u.username ?? "Guest"}
                  className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border-2 border-white dark:border-gray-900 flex items-center justify-center text-white text-[9px] font-black"
                >
                  {(u.username ?? "G")[0].toUpperCase()}
                </div>
              ))}
            </div>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 tabular-nums">
              {onlineUsers.length} online
            </span>
          </div>
        )}

        {/* Remote editing indicator */}
        {remoteEditing && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 animate-pulse">
            <Circle size={7} className="fill-amber-500 text-amber-500" />
            {remoteEditor} is editing…
          </span>
        )}

        <div className="flex-1" />

        {/* Language */}
        <select
          value={language}
          onChange={(e) => handleLangChange(e.target.value)}
          className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-1.5 px-3 text-xs font-mono text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer"
        >
          {LANGUAGES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        {/* Copy */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Editor */}
      <div className={`bg-gray-950 rounded-2xl overflow-hidden border transition-all duration-300 ${
        remoteEditing ? "border-amber-500/50 shadow-lg shadow-amber-500/10" : "border-gray-800"
      }`}>
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900/80 border-b border-gray-800">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
          </div>
          <span className="text-xs font-mono text-gray-500">
            main.{langMeta.ext}
          </span>
          <span className="text-xs text-gray-600 tabular-nums">{lineCount} lines</span>
        </div>

        {/* Code area with line numbers */}
        <div className="flex overflow-auto" style={{ minHeight: "360px", maxHeight: "560px" }}>
          <div
            aria-hidden
            className="select-none shrink-0 p-4 pr-3 text-right text-xs font-mono text-gray-700 leading-6 min-w-[3rem] border-r border-gray-800/60 bg-gray-950"
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <textarea
            value={code}
            onChange={handleCodeChange}
            spellCheck={false}
            placeholder="// Start coding — changes broadcast to teammates instantly"
            className="flex-1 p-4 pl-3 bg-transparent text-gray-100 text-xs font-mono leading-6 focus:outline-none resize-none w-full caret-blue-400 placeholder:text-gray-700"
            style={{ tabSize: 2 }}
          />
        </div>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-600 flex items-center gap-1.5">
        <Code2 size={11} />
        Keystrokes broadcast to teammates via Supabase Realtime.{!currentUser && " Sign in to collaborate."}
      </p>
    </div>
  );
}
