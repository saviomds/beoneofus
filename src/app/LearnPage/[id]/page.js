"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { CheckCircle2, Circle, ArrowLeft, ArrowRight, BookOpen, Loader2 } from "lucide-react";
import { supabase } from "../../supabaseClient";
import hljs from "highlight.js";
import "highlight.js/styles/shades-of-purple.css";

// ─── 1. Content Reader & Syntax Highlighter ───
function LessonContentReader({ content }) {
  useEffect(() => {
    // 1. Apply syntax highlighting
    hljs.highlightAll();

    // 2. Find all <pre> tags and inject a Copy Button
    const preTags = document.querySelectorAll("pre");
    
    preTags.forEach((pre) => {
      // Prevent adding duplicate buttons if the effect re-runs
      if (pre.querySelector(".copy-btn")) return;

      // Ensure the <pre> container is positioned relatively so the absolute button aligns correctly
      pre.style.position = "relative";

      const btn = document.createElement("button");
      btn.className = "copy-btn absolute top-3 right-3 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-lg transition-all text-xs font-bold backdrop-blur-sm border border-white/10";
      btn.innerHTML = "Copy";

      btn.addEventListener("click", async () => {
        // Find the code block text and copy it
        const code = pre.querySelector("code")?.innerText || "";
        await navigator.clipboard.writeText(code);
        
        // Provide visual feedback
        btn.innerHTML = "Copied!";
        btn.classList.add("bg-emerald-500/20", "text-emerald-400", "border-emerald-500/30");
        
        // Reset the button after 2 seconds
        setTimeout(() => {
          btn.innerHTML = "Copy";
          btn.classList.remove("bg-emerald-500/20", "text-emerald-400", "border-emerald-500/30");
        }, 2000);
      });

      pre.appendChild(btn);
    });
  }, [content]);

  return (
    <div 
      className="prose dark:prose-invert max-w-none 
                 [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:my-4 [&_pre]:shadow-lg [&_pre]:pt-12
                 [&_h1]:text-2xl [&_h1]:font-black [&_h1]:mb-4
                 [&_p]:text-gray-600 [&_p]:dark:text-gray-300 [&_p]:mb-4"
      dangerouslySetInnerHTML={{ __html: content || "" }} 
    />
  );
}

// ─── 2. Main Page Component ───
export default function LessonViewer() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  const courseId = params.id;
  const lessonIdParam = searchParams.get("lessonId");

  const [userId, setUserId] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth");
        return;
      }
      
      const uid = session.user.id;
      if (isMounted) setUserId(uid);

      // Fetch all lessons for the course to enable Next/Prev navigation
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("id", { ascending: true });

      if (lessonsData && isMounted) {
        setLessons(lessonsData);
        
        // Determine the current lesson (Defaults to 1st module if no lessonId passed in URL)
        const targetLessonId = lessonIdParam ? parseInt(lessonIdParam) : lessonsData[0]?.id;
        const current = lessonsData.find(l => l.id == targetLessonId) || lessonsData[0];
        setCurrentLesson(current);

        if (current) {
          // Check if this user already completed this lesson
          const { data: progData } = await supabase
            .from("user_lesson_progress")
            .select("status")
            .eq("user_id", uid)
            .eq("lesson_id", current.id)
            .single();

          if (progData && progData.status === "completed") {
            setIsCompleted(true);
          } else {
            setIsCompleted(false);
          }
        }
      }
      
      if (isMounted) setIsLoading(false);
    };

    init();
    return () => { isMounted = false; };
  }, [courseId, lessonIdParam, router]);

  const handleMarkComplete = async () => {
    if (!userId || !currentLesson || !courseId) return;
    
    setIsMarking(true);
    try {
      // Upsert progress cleanly
      const { error } = await supabase
        .from("user_lesson_progress")
        .upsert({
          user_id: userId,
          course_id: courseId,
          lesson_id: currentLesson.id,
          status: "completed",
          completed_at: new Date().toISOString()
        }, {
          onConflict: "user_id, lesson_id" 
        });

      if (error) throw error;
      
      setIsCompleted(true);
      
      // Find index & auto-navigate
      const currentIndex = lessons.findIndex(l => l.id === currentLesson.id);
      const nextLesson = lessons[currentIndex + 1];

      if (nextLesson) {
        router.push(`/LearnPage/${courseId}?lessonId=${nextLesson.id}`);
      } else {
        // Finished course! Route back to the main LearnPage dashboard
        router.push("/LearnPage");
      }
      
    } catch (err) {
      console.error("Failed to mark lesson as complete:", err.message);
      alert("Could not mark as complete. Try again.");
    } finally {
      setIsMarking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (!currentLesson) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-center p-6 text-center">
        <BookOpen size={48} className="text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">No lesson found</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">This course doesn't have any lessons yet, or the lesson you're looking for doesn't exist.</p>
        <button onClick={() => router.push("/LearnPage")} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20">
          Back to Courses
        </button>
      </div>
    );
  }

  const currentIndex = lessons.findIndex(l => l.id === currentLesson.id);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-100 selection:bg-blue-500/30 pb-20">
      {/* Top Navigation Strip */}
      <nav className="sticky top-0 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => router.push("/LearnPage")} className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <ArrowLeft size={16} /> Back to Course
          </button>
          <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate max-w-[200px] sm:max-w-xs">
            {currentLesson.title}
          </div>
          <div className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
            {currentIndex + 1} / {lessons.length}
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl md:text-4xl font-black mb-8 text-gray-900 dark:text-gray-100 tracking-tight">
          {currentLesson.title}
        </h1>

        <LessonContentReader content={currentLesson.content} />

        <div className="mt-12 flex justify-end">
          <button onClick={handleMarkComplete} disabled={isCompleted || isMarking} className={`flex items-center gap-2 px-6 py-3 font-bold rounded-xl transition-all shadow-sm ${isCompleted ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-default" : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 active:scale-95"}`}>
            {isCompleted ? <><CheckCircle2 size={20} /> Completed</> : <>{isMarking ? <Circle className="animate-spin" size={20} /> : <CheckCircle2 size={20} />} {isMarking ? "Saving..." : "Mark as Complete"}</>}
          </button>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between mt-16 pt-8 border-t border-gray-200 dark:border-gray-800">
          {prevLesson ? (
            <button onClick={() => router.push(`/LearnPage/${courseId}?lessonId=${prevLesson.id}`)} className="group flex flex-col items-start gap-1 text-left">
              <span className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider group-hover:text-blue-500 transition-colors"><ArrowLeft size={14} /> Previous</span>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{prevLesson.title}</span>
            </button>
          ) : <div />}
          {nextLesson && (
            <button onClick={() => router.push(`/LearnPage/${courseId}?lessonId=${nextLesson.id}`)} className="group flex flex-col items-end gap-1 text-right">
              <span className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider group-hover:text-blue-500 transition-colors">Next <ArrowRight size={14} /></span>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{nextLesson.title}</span>
            </button>
          )}
        </div>
      </main>
    </div>
  );
}