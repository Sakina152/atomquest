import { useState, useEffect } from 'react';
import { USERS } from './lib/mockData';
import { supabase } from './lib/supabase';
import { ToastProvider } from './components/Toast';
import Sidebar from './components/Sidebar';
import RoleSwitcher from './components/RoleSwitcher';
import Login from './pages/Login';
import GoalSheet from './pages/employee/GoalSheet';
import AchievementTracker from './pages/employee/AchievementTracker';
import TeamDashboard from './pages/manager/TeamDashboard';
import GoalReview from './pages/manager/GoalReview';
import CheckIn from './pages/manager/CheckIn';
import Dashboard from './pages/admin/Dashboard';
import AuditLog from './pages/admin/AuditLog';
import SharedGoalPush from './pages/admin/SharedGoalPush';
import ExportReport from './pages/admin/ExportReport';

const DEFAULT_ROUTE = { employee: 'goalsheet', manager: 'team', admin: 'dashboard' };

export default function App() {
  const [userId, setUserId] = useState(null); // mock id: 'u1', 'u4', 'u5'
  const [profile, setProfile] = useState(null); // real supabase profile row
  const [route, setRoute] = useState('goalsheet');
  const [reviewEmp, setReviewEmp] = useState(null);
  const [authReady, setAuthReady] = useState(false); // prevent flash of login screen

  // SUPABASE: on app load, check if a session already exists (handles page refresh)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data: prof }) => {
            if (prof) {
              // map supabase email back to mock id
              const mockUser = USERS.find((u) => u.email === session.user.email);
              if (mockUser) {
                setUserId(mockUser.id);
                setProfile(prof);
                setRoute(DEFAULT_ROUTE[prof.role]);
              }
            }
          });
      }
      setAuthReady(true);
    });

    // SUPABASE: listen for auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUserId(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // called from Login.jsx and RoleSwitcher.jsx
  // receives { supabaseUser, profile, mockId }
  const handleLogin = ({ profile: prof, mockId }) => {
    const mockUser = USERS.find((u) => u.id === mockId);
    setUserId(mockId);
    setProfile(prof);
    setRoute(DEFAULT_ROUTE[mockUser?.role || prof.role]);
  };

  const handleSwitch = ({ profile: prof, mockId }) => {
    const mockUser = USERS.find((u) => u.id === mockId);
    setUserId(mockId);
    setProfile(prof);
    setRoute(DEFAULT_ROUTE[mockUser?.role || prof.role]);
  };

  // SUPABASE: real sign out
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setProfile(null);
  };

  // prevent flashing the login page on refresh before session check completes
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm animate-pulse">Loading AtomQuest...</div>
      </div>
    );
  }

  const user = USERS.find((u) => u.id === userId);

  return (
    <ToastProvider>
      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <div className="flex min-h-screen bg-slate-50">
          <Sidebar user={user} profile={profile} active={route} onNavigate={setRoute} onLogout={handleLogout} />
          <main className="flex-1 overflow-x-hidden pt-14 md:pt-0">
            {user.role === 'employee' && route === 'goalsheet' && <GoalSheet user={user} profile={profile} />}
            {user.role === 'employee' && route === 'tracker' && <AchievementTracker user={user} profile={profile} />}
            {user.role === 'manager' && route === 'team' && <TeamDashboard user={user} profile={profile} onOpenReview={(id) => { setReviewEmp(id); setRoute('review'); }} />}
            {user.role === 'manager' && route === 'review' && <GoalReview user={user} profile={profile} selectedEmployeeId={reviewEmp} />}
            {user.role === 'manager' && route === 'checkin' && <CheckIn user={user} profile={profile} />}
            {user.role === 'admin' && route === 'dashboard' && <Dashboard profile={profile} />}
            {user.role === 'admin' && route === 'audit' && <AuditLog profile={profile} />}
            {user.role === 'admin' && route === 'shared' && <SharedGoalPush profile={profile} />}
            {user.role === 'admin' && route === 'export' && <ExportReport profile={profile} />}
          </main>
          <RoleSwitcher onSwitch={handleSwitch} currentId={userId} />
        </div>
      )}
    </ToastProvider>
  );
}