import { StudyWorkProvider } from '../_study-work/state/StudyWorkContext'

export const metadata = {
  title: 'Apply — beoneofus Study & Work Abroad',
}

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return <StudyWorkProvider>{children}</StudyWorkProvider>
}
