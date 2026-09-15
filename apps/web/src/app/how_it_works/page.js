import { redirect } from 'next/navigation';

// Legacy duplicate of /how-it-works (hyphen), which has the real, current
// Study/Work Abroad content — this underscore route used to carry its own
// contradictory generic "career platform" copy.
export default function LegacyHowItWorksPage() {
  redirect('/how-it-works');
}
