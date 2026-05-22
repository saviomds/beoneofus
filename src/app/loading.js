import Image from 'next/image';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-950">
      <div className="flex flex-col items-center gap-8">
        <Image
          src="/logo.png"
          alt="beoneofus"
          width={72}
          height={72}
          priority
          className="rounded-2xl shadow-md"
        />
        <span className="text-lg font-semibold tracking-wide text-gray-800 dark:text-gray-100">
          beoneofus
        </span>
        <div className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-gray-700 border-t-blue-500 animate-spin" />
      </div>
    </div>
  );
}
