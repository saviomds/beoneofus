"use client";

import { useState, useEffect } from "react";
import { Rocket, Send, Loader2, CheckCircle2, AlertTriangle, Briefcase, Star, User, MessageSquare, ChevronRight, ChevronLeft, Zap, Users, UserPlus } from "lucide-react";
import { supabase } from "../../supabaseClient";

export default function FounderContent() {
  const [formData, setFormData] = useState({
    name: "",
    role: "member", // default to member, can be "cofounder"
    mem_q1: "",
    mem_q2: "",
    mem_q3: "",
    mem_q4: "",
    mem_q5: "",
    mem_q6: "",
    mem_q7: "",
    cf_q1: "",
    cf_q2: "",
    cf_q3: "",
    cf_q4: "",
    cf_q5: "",
    cf_q6: "",
    cf_q7: "",
    cf_q8: "",
    cf_q9: "",
    cf_q10: "",
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [stepError, setStepError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
        // Pre-fill name if available in the profile
        const { data } = await supabase.from('profiles').select('username').eq('id', session.user.id).single();
        if (data?.username) {
          setFormData(prev => ({ ...prev, name: data.username }));
        }
      }
    };
    fetchUser();
  }, []);

  // Define steps dynamically based on the selected role
  const steps = [
    {
      id: 'role',
      field: 'role',
      title: 'How do you want to join?',
      subtitle: 'Select your intended path within the B1overs network.',
      icon: Rocket
    },
    {
      id: 'name',
      field: 'name',
      title: 'What is your full name?',
      subtitle: 'This will be displayed on your network profile.',
      icon: User
    },
    ...(formData.role === 'cofounder' ? [
      { id: 'cf_q1', field: 'cf_q1', title: 'Previous Ventures', subtitle: 'Describe a previous startup or venture you led—what were the biggest challenges you faced?', icon: Briefcase },
      { id: 'cf_q2', field: 'cf_q2', title: 'Scaling', subtitle: 'How do you approach scaling a technology platform from zero to growth?', icon: Zap },
      { id: 'cf_q3', field: 'cf_q3', title: 'Vision', subtitle: 'What is your long-term vision for B1overs in the developer community?', icon: Star },
      { id: 'cf_q4', field: 'cf_q4', title: 'Conflict Resolution', subtitle: 'How do you handle conflicts or disagreements in a founding team?', icon: MessageSquare },
      { id: 'cf_q5', field: 'cf_q5', title: 'Market Gaps', subtitle: 'What key market gaps do you see in developer social networking, and how would you address them?', icon: Briefcase },
      { id: 'cf_q6', field: 'cf_q6', title: 'Partnerships & Investment', subtitle: 'Tell us about a time you secured investment or built partnerships—how did you succeed?', icon: Briefcase },
      { id: 'cf_q7', field: 'cf_q7', title: 'Emerging Trends', subtitle: 'What emerging developer trends do you believe will shape the future of tech networking?', icon: Zap },
      { id: 'cf_q8', field: 'cf_q8', title: 'Leadership', subtitle: 'How do you balance short-term execution with long-term vision as a leader?', icon: Star },
      { id: 'cf_q9', field: 'cf_q9', title: 'Culture & Diversity', subtitle: 'How do you plan to foster inclusivity and diversity within B1overs?', icon: User },
      { id: 'cf_q10', field: 'cf_q10', title: 'First Year Milestones', subtitle: 'What technical or business milestones would you set for yourself in the first year as a co-founder?', icon: Rocket }
    ] : [
      { id: 'mem_q1', field: 'mem_q1', title: 'Collaboration', subtitle: 'How do you approach collaboration in a remote or distributed team environment?', icon: Users },
      { id: 'mem_q2', field: 'mem_q2', title: 'Tools & Workflows', subtitle: 'What tools and workflows do you use to ensure efficient project delivery?', icon: Briefcase },
      { id: 'mem_q3', field: 'mem_q3', title: 'Debugging', subtitle: 'How do you handle debugging and troubleshooting complex technical issues?', icon: Zap },
      { id: 'mem_q4', field: 'mem_q4', title: 'Mentorship', subtitle: 'Tell us about a time you mentored or helped junior developers—how did you approach it?', icon: UserPlus },
      { id: 'mem_q5', field: 'mem_q5', title: 'Problem Solving', subtitle: 'What’s a challenging bug or problem you encountered, and how did you solve it?', icon: AlertTriangle },
      { id: 'mem_q6', field: 'mem_q6', title: 'Scalability', subtitle: 'How do you ensure your code is scalable and maintainable for future growth?', icon: Rocket },
      { id: 'mem_q7', field: 'mem_q7', title: 'Why B1overs?', subtitle: 'What excites you most about joining a network of developers, and what unique value would you bring to B1overs?', icon: Star }
    ])
  ];

  const handleNext = () => {
    const currentField = steps[currentStep].field;
    if (typeof formData[currentField] === 'string' && !formData[currentField].trim()) {
      setStepError("Please complete this field before proceeding.");
      return;
    }
    setStepError("");
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      submitData();
    }
  };

  const handleBack = () => {
    setStepError("");
    setCurrentStep(prev => prev - 1);
  };

  const submitData = async () => {
    setStepError("");
    setIsSubmitting(true);

    try {
      if (!currentUserId) throw new Error("You must be logged in to submit this form.");

      // Format responses based on role to fit into the existing database schema safely
      const compiledResponses = formData.role === 'cofounder' 
        ? {
            q1_challenges: formData.cf_q1.trim(),
            q2_scaling: formData.cf_q2.trim(),
            q3_vision: formData.cf_q3.trim(),
            q4_conflict: formData.cf_q4.trim(),
            q5_market_gaps: formData.cf_q5.trim(),
            q6_partnerships: formData.cf_q6.trim(),
            q7_trends: formData.cf_q7.trim(),
            q8_leadership: formData.cf_q8.trim(),
            q9_culture: formData.cf_q9.trim(),
            q10_milestones: formData.cf_q10.trim(),
          }
        : {
            q1_collaboration: formData.mem_q1.trim(),
            q2_tools: formData.mem_q2.trim(),
            q3_debugging: formData.mem_q3.trim(),
            q4_mentorship: formData.mem_q4.trim(),
            q5_problem_solving: formData.mem_q5.trim(),
            q6_scalability: formData.mem_q6.trim(),
            q7_why_join: formData.mem_q7.trim(),
          };

      // Save the form data to Supabase
      const { data, error } = await supabase.from('founder_applications').insert({
        user_id: currentUserId,
        name: formData.name.trim(),
        intended_role: formData.role,
        skills: 'See full responses',
        experience: 'See full responses',
        reason: compiledResponses,
        status: 'pending',
      }).select();

      if (error) {
        throw new Error(error.message || JSON.stringify(error));
      }
      
      if (!data || data.length === 0) {
        throw new Error("Database error: Empty response. Please verify your 'founder_applications' table is created and Row Level Security (RLS) policies are correctly configured.");
      }

      // Trigger email notification to admin
      fetch('/api/notify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_founder_app',
          name: formData.name.trim(),
          role: formData.role
        })
      }).catch(err => console.error('Failed to trigger admin email API:', err));

      setIsSuccess(true);
      
      // Redirect to the personalized dashboard after a short delay
      setTimeout(() => {
        window.location.href = "/dash"; // Adjust this route if needed
      }, 2000);

    } catch (err) {
      console.error("Submission error details:", err);
      
      let errorMessage = "An unexpected error occurred during submission.";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === 'object') {
        const str = JSON.stringify(err);
        errorMessage = str === '{}' 
          ? "Database error: Empty response. Please verify your 'founder_applications' table is created and Row Level Security (RLS) policies are correctly configured."
          : str;
      } else {
        errorMessage = String(err);
      }
      
      setStepError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleNext();
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 text-green-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-green-100 dark:border-green-800/50">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight mb-2">Application Received!</h2>
        <p className="text-gray-500 dark:text-gray-400 font-medium text-center max-w-sm">
          Welcome to the next phase of your journey. Redirecting you to your personalized dashboard...
        </p>
        <Loader2 className="animate-spin text-blue-500 mt-8" size={24} />
      </div>
    );
  }

  const currentStepData = steps[currentStep];
  const StepIcon = currentStepData.icon;
  const progressPercentage = (currentStep / (steps.length - 1)) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col bg-transparent animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 mt-8">
      
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
          <span>Step {currentStep + 1} of {steps.length}</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Wizard Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] shadow-xl relative overflow-hidden flex flex-col min-h-[400px]">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-transparent opacity-50" />
        
        <div className="flex-1 p-8 sm:p-10 flex flex-col justify-center">
          <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-blue-100 dark:border-blue-800/50">
            <StepIcon size={28} />
          </div>
          
          <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tight mb-2">
            {currentStepData.title}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-8">
            {currentStepData.subtitle}
          </p>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            
            {/* Conditional Input Rendering */}
            <div className="animate-in fade-in slide-in-from-right-4 duration-300" key={currentStep}>
              {currentStepData.field === 'role' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 cursor-pointer transition-all ${formData.role === 'cofounder' ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-500 text-purple-700 dark:text-purple-400 shadow-md scale-[1.02]' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-white dark:hover:bg-gray-800'}`}>
                    <input type="radio" name="role" value="cofounder" checked={formData.role === 'cofounder'} onChange={() => setFormData({ ...formData, role: 'cofounder' })} className="hidden" />
                    <Star size={32} className={formData.role === 'cofounder' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'} />
                    <span className="font-bold text-lg">Co-founder</span>
                  </label>
                  <label className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 cursor-pointer transition-all ${formData.role === 'member' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-400 shadow-md scale-[1.02]' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-white dark:hover:bg-gray-800'}`}>
                    <input type="radio" name="role" value="member" checked={formData.role === 'member'} onChange={() => setFormData({ ...formData, role: 'member' })} className="hidden" />
                    <User size={32} className={formData.role === 'member' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'} />
                    <span className="font-bold text-lg">Member</span>
                  </label>
                </div>
              )}

              {currentStepData.field === 'name' && (
                <input 
                  autoFocus
                  type="text" 
                  value={formData[currentStepData.field]} 
                  onChange={(e) => setFormData({ ...formData, [currentStepData.field]: e.target.value })} 
                  placeholder="e.g. John Doe"
                  className={`w-full bg-gray-50 dark:bg-gray-800/50 border ${stepError ? 'border-red-400 focus:ring-red-500/20 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500/20 focus:border-blue-500'} rounded-2xl py-4 px-5 text-lg text-gray-900 dark:text-gray-100 outline-none transition-all shadow-sm`} 
                />
              )}

              {currentStepData.field !== 'role' && currentStepData.field !== 'name' && (
                <textarea 
                  autoFocus
                  rows={4} 
                  value={formData[currentStepData.field]} 
                  onChange={(e) => setFormData({ ...formData, [currentStepData.field]: e.target.value })} 
                  placeholder="Type your answer here..." 
                  className={`w-full bg-gray-50 dark:bg-gray-800/50 border ${stepError ? 'border-red-400 focus:ring-red-500/20 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500/20 focus:border-blue-500'} rounded-2xl py-4 px-5 text-base text-gray-900 dark:text-gray-100 outline-none transition-all shadow-sm resize-none custom-scrollbar`} 
                />
              )}
            </div>

            {/* Error Message */}
            {stepError && (
              <div className="flex items-center gap-2 text-red-500 text-sm font-bold mt-3 animate-in fade-in">
                <AlertTriangle size={16} />
                {stepError}
              </div>
            )}

            {/* Hidden submit button to allow Enter key submission */}
            <button type="submit" className="hidden" />
          </form>
        </div>

        {/* Footer Navigation */}
        <div className="p-6 sm:px-10 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <button 
            onClick={handleBack} 
            disabled={currentStep === 0 || isSubmitting}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-0 disabled:pointer-events-none"
          >
            <ChevronLeft size={18} /> Back
          </button>

          <button 
            onClick={handleNext} 
            disabled={isSubmitting}
            className={`flex items-center justify-center gap-2 py-3 px-8 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-md active:scale-95 ${currentStep === steps.length - 1 ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20' : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-white'}`}
          >
            {isSubmitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : currentStep === steps.length - 1 ? (
              <><Send size={18} /> Submit</>
            ) : (
              <>Next <ChevronRight size={18} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}