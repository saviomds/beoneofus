export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 px-4">
      <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            Welcome to
          </h1>
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            beoneofus
          </h2>
        </div>
        <p className="text-base md:text-lg text-gray-300 font-medium max-w-sm mx-auto leading-relaxed">
          Connect with developers worldwide. Broadcast your code. Join secure workspaces.
        </p>
        <div className="flex justify-center space-x-2 pt-4">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}