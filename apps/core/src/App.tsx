import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ROLE_HOME } from '@/config/nav'
import { RequireAuth, RequireRole } from '@/components/auth/guards'
import { PortalLayout } from '@/components/layout/PortalLayout'

import { Login } from '@/pages/auth/Login'
import { ForgotPassword } from '@/pages/auth/ForgotPassword'
import { VerifyCredential } from '@/pages/verify/VerifyCredential'
import { NotFound, PortalNotFound } from '@/pages/system/NotFound'

import { NotificationsPage, MessagesPage, SettingsPage, AccountProfilePage } from '@/pages/shared/CommonPages'

import * as S from '@/pages/student/StudentPages'
import * as T from '@/pages/teacher/TeacherPages'
import * as SC from '@/pages/school/SchoolPages'
import * as SX from '@/pages/school/SchoolExtra'
import * as SN from '@/pages/school/NetworkPages'
import * as SA from '@/pages/school/AcademicPages'
import * as SO from '@/pages/school/OperationsPages'
import { MyFinance } from '@/pages/shared/FinancePages'
import { Gradebook } from '@/pages/teacher/Gradebook'
import { StudentReportCards } from '@/pages/student/ReportCards'
import * as GD from '@/pages/guardian/GuardianPages'
import * as G from '@/pages/government/GovernmentPages'
import { GovernmentAuthorize } from '@/pages/government/GovernmentAuthorize'
import { GovernmentCampaigns } from '@/pages/government/GovernmentCampaigns'
import * as A from '@/pages/admin/AdminPages'
import * as AX from '@/pages/admin/AdminExtra'
import { RegisterInstitution } from '@/pages/onboarding/RegisterInstitution'

function HomeRedirect() {
  const { role, isAuthenticated, initializing } = useAuth()
  if (initializing) return <div className="route-splash">Loading…</div>
  if (!isAuthenticated || !role) return <Navigate to="/login" replace />
  return <Navigate to={ROLE_HOME[role]} replace />
}

/** Legacy /app/* links → nearest new route. */
function LegacyRedirect() {
  const { role } = useAuth()
  const params = useParams()
  const rest = params['*'] ?? ''
  if (!role) return <Navigate to="/login" replace />
  const map: Record<string, string> = {
    '': ROLE_HOME[role],
    education: `${ROLE_HOME[role]}`,
    inbox: `/${role === 'mentor' ? 'teacher' : role}/messages`,
    profile: `/${role === 'mentor' ? 'teacher' : role}/profile`,
    settings: `/${role === 'mentor' ? 'teacher' : role}/settings`,
  }
  return <Navigate to={map[rest] ?? ROLE_HOME[role]} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/register/institution" element={<RegisterInstitution />} />
      <Route path="/verify" element={<VerifyCredential />} />
      <Route path="/verify/:code" element={<VerifyCredential />} />

      {/* Student portal */}
      <Route
        path="/student"
        element={
          <RequireAuth>
            <RequireRole roles={['student']}>
              <PortalLayout />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<S.StudentDashboard />} />
        <Route path="profile" element={<S.StudentProfile />} />
        <Route path="academic" element={<S.StudentAcademic />} />
        <Route path="courses" element={<S.StudentCourses />} />
        <Route path="schedule" element={<S.StudentSchedule />} />
        <Route path="attendance" element={<S.StudentAttendance />} />
        <Route path="report-cards" element={<StudentReportCards />} />
        <Route path="reports" element={<S.StudentReports />} />
        <Route path="finance" element={<MyFinance />} />
        <Route path="credentials" element={<S.StudentCredentials />} />
        <Route path="mentors" element={<S.StudentMentors />} />
        <Route path="requests" element={<S.StudentRequests />} />
        <Route path="documents" element={<S.StudentDocuments />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<PortalNotFound />} />
      </Route>

      {/* Teacher / Mentor portal */}
      <Route
        path="/teacher"
        element={
          <RequireAuth>
            <RequireRole roles={['teacher', 'mentor']}>
              <PortalLayout />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<T.TeacherDashboard />} />
        <Route path="profile" element={<AccountProfilePage />} />
        <Route path="students" element={<T.TeacherStudents />} />
        <Route path="classes" element={<T.TeacherClasses />} />
        <Route path="schedule" element={<T.TeacherSchedule />} />
        <Route path="attendance" element={<T.TeacherAttendance />} />
        <Route path="gradebook" element={<Gradebook />} />
        <Route path="reports" element={<T.TeacherReports />} />
        <Route path="mentorship" element={<T.TeacherMentorship />} />
        <Route path="resources" element={<T.TeacherResources />} />
        <Route path="announcements" element={<T.TeacherAnnouncements />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<PortalNotFound />} />
      </Route>

      {/* School portal */}
      <Route
        path="/school"
        element={
          <RequireAuth>
            <RequireRole roles={['school']}>
              <PortalLayout />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<SC.SchoolDashboard />} />
        <Route path="profile" element={<SC.SchoolProfile />} />
        <Route path="students" element={<SC.SchoolStudents />} />
        <Route path="teachers" element={<SC.SchoolTeachers />} />
        <Route path="mentors" element={<SC.SchoolMentors />} />
        <Route path="transfers" element={<SX.SchoolTransfers />} />
        <Route path="record-requests" element={<SN.RecordRequests />} />
        <Route path="credentials" element={<SN.IssuedCredentials />} />
        <Route path="campaigns" element={<SN.SchoolCampaigns />} />
        <Route path="classes" element={<SC.SchoolClasses />} />
        <Route path="subjects" element={<SC.SchoolSubjects />} />
        <Route path="programs" element={<SX.InstitutionPrograms />} />
        <Route path="attendance" element={<SC.SchoolAttendance />} />
        <Route path="academic" element={<SC.SchoolAcademic />} />
        <Route path="grading" element={<SA.GradingSchemes />} />
        <Route path="report-cards" element={<SA.ReportCards />} />
        <Route path="interventions" element={<SA.Interventions />} />
        <Route path="guardians" element={<SA.GuardianLinks />} />
        <Route path="admissions" element={<SO.Admissions />} />
        <Route path="timetable" element={<SO.Timetable />} />
        <Route path="finance" element={<SO.Finance />} />
        <Route path="import" element={<SO.BulkImport />} />
        <Route path="year-end" element={<SO.YearEnd />} />
        <Route path="reports" element={<SC.SchoolReports />} />
        <Route path="documents" element={<SC.SchoolDocuments />} />
        <Route path="announcements" element={<SC.SchoolAnnouncements />} />
        <Route path="government" element={<SC.SchoolGovernment />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="audit" element={<SC.SchoolAudit />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<PortalNotFound />} />
      </Route>

      {/* Guardian portal */}
      <Route
        path="/guardian"
        element={
          <RequireAuth>
            <RequireRole roles={['guardian']}>
              <PortalLayout />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<GD.GuardianOverview />} />
        <Route path="children" element={<GD.GuardianChildren />} />
        <Route path="finance" element={<MyFinance />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<PortalNotFound />} />
      </Route>

      {/* Government portal */}
      <Route
        path="/government"
        element={
          <RequireAuth>
            <RequireRole roles={['government']}>
              <PortalLayout />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<G.GovernmentDashboard />} />
        <Route path="schools" element={<G.GovernmentSchools />} />
        <Route path="institutions" element={<G.GovernmentInstitutions />} />
        <Route path="authorize" element={<GovernmentAuthorize />} />
        <Route path="campaigns" element={<GovernmentCampaigns />} />
        <Route path="analytics" element={<G.GovernmentAnalytics />} />
        <Route path="reports" element={<G.GovernmentReports />} />
        <Route path="requests" element={<G.GovernmentRequests />} />
        <Route path="announcements" element={<G.GovernmentAnnouncements />} />
        <Route path="documents" element={<G.GovernmentDocuments />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="audit" element={<G.GovernmentAudit />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<PortalNotFound />} />
      </Route>

      {/* Admin portal */}
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <RequireRole roles={['admin']}>
              <PortalLayout />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<A.AdminDashboard />} />
        <Route path="organizations" element={<AX.AdminOrganizations />} />
        <Route path="invitations" element={<AX.AdminInvitations />} />
        <Route path="users" element={<A.AdminUsers />} />
        <Route path="students" element={<A.AdminStudents />} />
        <Route path="teachers" element={<A.AdminTeachers />} />
        <Route path="mentors" element={<A.AdminMentors />} />
        <Route path="schools" element={<A.AdminSchools />} />
        <Route path="government" element={<A.AdminGovernment />} />
        <Route path="reports" element={<A.AdminReports />} />
        <Route path="requests" element={<A.AdminRequests />} />
        <Route path="content" element={<A.AdminContent />} />
        <Route path="notifications" element={<A.AdminNotifications />} />
        <Route path="audit" element={<A.AdminAudit />} />
        <Route path="system" element={<AX.AdminSystemHealth />} />
        <Route path="backups" element={<AX.AdminBackups />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<PortalNotFound />} />
      </Route>

      <Route path="/app/*" element={<RequireAuth><LegacyRedirect /></RequireAuth>} />
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
