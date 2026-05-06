"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  Terminal, ArrowLeft, Search, BookOpen, PlayCircle, 
  ChevronRight, Clock, User, Laptop
} from "lucide-react";
import FloatingAiAssistant from "../../components/FloatingAiAssistant";
import { supabase } from "../../supabaseClient";

type Course = {
  id: string;
  title: string;
  category: string;
  level: string;
  duration: string;
  lessons: number;
  rating: number;
  desc?: string;
  description?: string;
  topics: string[];
  author: string;
  thumbnail_url?: string;
};

const CATEGORIES = ["All", "Frontend", "Backend", "Artificial Intelligence", "Networking", "Security"];

function AcademyContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("user_id") || searchParams.get("userId");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (!error && data) {
        setCourses(data);
      }
      setIsLoading(false);
    };
    fetchCourses();
  }, []);

  const filteredCourses = courses.filter(c => {
    const descText = (c.description || c.desc || "").toLowerCase();
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || descText.includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || c.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 selection:bg-blue-500/30 overflow-x-hidden relative">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      
      {/* Navbar */}
      <nav className="fixed top-0 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="font-black text-2xl tracking-tighter flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Terminal className="text-blue-500 dark:text-blue-400" size={28} />
            <span>beone<span className="text-blue-600 dark:text-blue-400">of</span>us</span>
          </Link>
          <div className="flex items-center gap-4">
            {userId && (
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full text-sm font-bold border border-blue-100 dark:border-blue-800/50">
                <User size={16} />
                <span className="max-w-[100px] truncate">{userId}</span>
              </div>
            )}
            <Link href="/dash" className="text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors hidden sm:block">
              Dashboard
            </Link>
            <Link href="/" className="text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-xl">
              <ArrowLeft size={16} /> Back
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6 relative z-10 max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-widest mb-4">
            <BookOpen size={14} /> BeOneOfUs Academy
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 text-gray-900 dark:text-gray-100">
            Learn, Build, and <span className="text-blue-600 dark:text-blue-500">Master</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 font-medium max-w-2xl">
            Interactive code reading, deep-dive tutorials, and structural knowledge directly from the maintainers of the network.
          </p>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row items-center gap-4 mb-10">
          <div className="relative group w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics, skills, or courses..." 
              className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto w-full pb-2 md:pb-0 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeCategory === cat 
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md" 
                    : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 py-20 flex justify-center">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredCourses.length > 0 ? (
            filteredCourses.map((course) => (
              <Link href={`/LearnPage/${course.id}${userId ? `?user_id=${userId}` : ""}`} key={course.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:shadow-lg transition-all group cursor-pointer flex flex-col h-full">
                {course.thumbnail_url ? (
                  <div className="relative w-full h-40 mb-4 rounded-xl overflow-hidden shrink-0 border border-gray-200 dark:border-gray-800">
                    {course.thumbnail_url.match(/\.(mp4|webm|ogg)$/i) ? (
                      <video src={course.thumbnail_url} className="object-cover w-full h-full" muted loop playsInline autoPlay />
                    ) : (
                      <img src={course.thumbnail_url} alt={course.title} className="object-cover w-full h-full" />
                    )}
                    <div className="absolute top-2 right-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg backdrop-blur-md ${
                        course.level === 'Beginner' ? 'bg-green-100/90 text-green-700 dark:bg-green-900/90 dark:text-green-400' :
                        course.level === 'Intermediate' ? 'bg-amber-100/90 text-amber-700 dark:bg-amber-900/90 dark:text-amber-400' :
                        'bg-red-100/90 text-red-700 dark:bg-red-900/90 dark:text-red-400'
                      }`}>
                        {course.level}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
                      <Laptop size={24} />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                      course.level === 'Beginner' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      course.level === 'Intermediate' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {course.level}
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{course.title}</h3>
                <div 
                  className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6 flex-1 line-clamp-3 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-bold"
                  dangerouslySetInnerHTML={{ __html: course.desc || course.description || "" }}
                />
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {(course.topics || []).slice(0, 3).map((topic, i) => (
                    <span key={i} className="text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700">
                      {topic}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3 text-sm font-bold text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5"><Clock size={16} /> {course.duration}</span>
                    <span className="flex items-center gap-1.5"><PlayCircle size={16} /> {course.lessons} L</span>
                  </div>
                  <ChevronRight size={18} className="text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-12 text-center shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No courses found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">We couldnot find any learning materials matching your criteria.</p>
              {userId && (
                <p className="text-sm font-mono text-gray-500 dark:text-gray-400 mb-6">User ID: {userId}</p>
              )}
              <button onClick={() => {setSearchQuery(""); setActiveCategory("All");}} className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/40">
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </main>
      <FloatingAiAssistant />
    </div>
  );
}

export default function AcademyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center text-gray-500 font-medium">Loading Academy...</div>}>
      <AcademyContent />
    </Suspense>
  );
}