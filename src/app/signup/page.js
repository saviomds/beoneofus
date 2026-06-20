import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Create Account — beoneofus',
  description: 'Join beoneofus — the professional network for builders.',
};

export default function SignupPage({ searchParams }) {
  const ref = searchParams?.ref;
  const next = searchParams?.next;
  const params = new URLSearchParams({ mode: 'sign-up' });
  if (ref) params.set('ref', ref);
  if (next) params.set('next', next);
  redirect(`/auth?${params.toString()}`);
}
