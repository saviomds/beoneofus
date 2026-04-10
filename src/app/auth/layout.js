export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      {children}
    </div>
  );
}