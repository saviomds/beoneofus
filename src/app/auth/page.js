import Link from 'next/link';
import AuthForm from '../components/Auth'; // Ensure this matches your filename exactly

export default function AuthPage() {
  return (
    <div className="w-full max-w-lg z-10 p-8">
      <div className="text-center mb-10">
        <Link href="/" className="inline-block group">
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 mb-2 transition-all group-hover:scale-105">
            beone<span className="text-blue-500">of</span>us
          </h1>
        </Link>
        <p className="text-gray-500 text-sm font-light tracking-wide uppercase">
          Developer Network & Collaboration
        </p>
      </div>

      {/* The Form Card */}
      <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-xl">
        <AuthForm />
      </div>

      <div className="text-center mt-8">
        <Link
          href="/"
          className="group text-gray-600 hover:text-blue-600 text-sm transition-colors flex items-center justify-center gap-2"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> 
          Back to home
        </Link>
      </div>
    </div>
  );
}