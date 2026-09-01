import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Create Account — beoneofus',
  description: 'Join beoneofus — the professional network for builders.',
};

export default async function SignupPage({ searchParams }) {
  // Next 16: searchParams is a Promise and must be awaited before use.
  const sp = await searchParams;
  const ref = sp?.ref;
  const next = sp?.next;
  const params = new URLSearchParams({ mode: 'sign-up' });
  if (ref) params.set('ref', ref);
  if (next) params.set('next', next);
  redirect(`/auth?${params.toString()}`);
}
