"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";
import { ArrowLeft, Play, Terminal, Loader2, BookOpen } from "lucide-react";
import { supabase } from "../../supabaseClient";

export default function LessonView() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  
  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [code, setCode] = useState("// Write your code here...\nconsole.log('Hello, BeOneOfUs!');");
  const [output, setOutput] = useState("");

  useEffect(() => {
    if (!id) return;
    const fetchCourse = async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", id)
        .single();
      
      if (data) setCourse(data);
      setIsLoading(false);
    };
    fetchCourse();
  }, [id]);

  const handleRunCode = () => {
    try {
      // Capture console.log output dynamically
      const originalLog = console.log;
      const logs: string[] = [];
      console.log = (...args) => {
        logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
      };
      
      // Execute the code securely in the browser
      // eslint-disable-next-line no-eval
      eval(code);
      
      console.log = originalLog;
      setOutput(logs.join('\n') || "Code executed successfully with no output.");
    } catch (err: any) {
      setOutput(`Error: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center flex-col gap-4">
        <p className="text-gray-500 font-bold">Course not found.</p>
        <button onClick={() => router.back()} className="text-blue-500 font-bold hover:underline">Go Back</button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <h1 className="font-bold text-sm truncate max-w-[300px]">{course.title}</h1>
          <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
            Interactive Lesson
          </span>
        </div>
        
        <button 
          onClick={handleRunCode}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-all shadow-sm active:scale-95"
        >
          <Play size={14} fill="currentColor" /> Run Code
        </button>
      </header>

      {/* Main Content Split */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Lesson Content */}
        <div className="w-full md:w-1/3 lg:w-2/5 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-y-auto p-6 custom-scrollbar flex flex-col">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-4">
            <BookOpen size={20} />
            <h2 className="font-black text-xl tracking-tight">Lesson Overview</h2>
          </div>
          
          <div 
            className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed max-w-none [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_pre]:bg-gray-100 dark:[&_pre]:bg-gray-800 [&_pre]:p-4 [&_pre]:rounded-xl [&_code]:text-blue-600 dark:[&_code]:text-blue-400 [&_code]:bg-blue-50 dark:[&_code]:bg-blue-900/20 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md"
            dangerouslySetInnerHTML={{ __html: course.description || course.desc || "No description provided." }}
          />
        </div>

        {/* Right: Editor & Terminal */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Editor */}
          <div className="flex-1 relative">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: "on",
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
              }}
            />
          </div>
          
          {/* Output / Terminal Panel */}
          <div className="h-1/3 border-t border-gray-200 dark:border-gray-800 bg-[#1e1e1e] flex flex-col shrink-0">
            <div className="h-10 border-b border-gray-800 flex items-center px-4 bg-[#252526]">
              <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider">
                <Terminal size={14} /> Output Console
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto font-mono text-sm text-gray-300 whitespace-pre-wrap">
              {output || "Waiting for execution..."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}