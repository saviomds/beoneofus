import NewPost from './components/NewPost';

export default function Home() {
  return (
    <>
    <div className="p-6">
      {/* 1. New Post Area */}
      <NewPost />

      {/* 2. Tabs Navigation */}
      <div className="flex gap-8 border-b border-white/5 mb-6">
        <button className="text-white border-b-2 border-brand-orange pb-4 font-semibold flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-orange"></span>
          Following
        </button>
        <button className="text-gray-500 pb-4 hover:text-gray-300 transition">Featured</button>
        <button className="text-gray-500 pb-4 hover:text-gray-300 transition">Rising</button>
      </div>

      {/* 3. Feed Content Placeholder */}
      <div className="space-y-4">
        {/* We will build the Code Card next */}
        <div className="h-64 border border-dashed border-white/10 rounded-2xl flex items-center justify-center text-gray-600">
          Feed items will load here...
        </div>
      </div>
    </div>

    </>

  );
}