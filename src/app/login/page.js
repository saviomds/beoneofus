import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Sign In — beoneofus',
  description: 'Sign in to your beoneofus account.',
};

export default async function LoginPage({ searchParams }) {
  // Next 16: searchParams is a Promise and must be awaited before use.
  const sp = await searchParams;
  const next = sp?.next;
  const url = next ? `/auth?next=${encodeURIComponent(next)}` : '/auth';
  redirect(url);
}
