import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Sign In — beoneofus',
  description: 'Sign in to your beoneofus account.',
};

export default function LoginPage({ searchParams }) {
  const next = searchParams?.next;
  const url = next ? `/auth?next=${encodeURIComponent(next)}` : '/auth';
  redirect(url);
}
