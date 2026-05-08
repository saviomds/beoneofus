import { redirect } from 'next/navigation';

export default function DashPage() {
  redirect('/dash/feed');
}
