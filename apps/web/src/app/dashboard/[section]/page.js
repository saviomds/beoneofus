import { redirect } from 'next/navigation';

// Handles both full-page and client-side navigation to /dashboard/:section
// next.config.js redirects only fire server-side; this catches the client-side case.
export default async function DashboardSectionRedirect({ params }) {
  const { section } = await params;
  redirect(`/dash/${section}`);
}
