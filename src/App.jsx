import { useState } from 'react';
import { USERS } from './lib/mockData';
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
  const [userId, setUserId] = useState(null);
  const [route, setRoute] = useState('goalsheet');
  const [reviewEmp, setReviewEmp] = useState(null);

  const user = USERS.find((u) => u.id === userId);

  const handleLogin = (id) => {
    const u = USERS.find((x) => x.id === id);
    setUserId(id);
    setRoute(DEFAULT_ROUTE[u.role]);
  };
  const handleSwitch = (id) => {
    const u = USERS.find((x) => x.id === id);
    setUserId(id);
    setRoute(DEFAULT_ROUTE[u.role]);
  };

  return (
    <ToastProvider>
      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <div className="flex min-h-screen bg-slate-50">
          <Sidebar user={user} active={route} onNavigate={setRoute} onLogout={() => setUserId(null)} />
          <main className="flex-1 overflow-x-hidden pt-14 md:pt-0">
            {user.role === 'employee' && route === 'goalsheet' && <GoalSheet user={user} />}
            {user.role === 'employee' && route === 'tracker' && <AchievementTracker user={user} />}
            {user.role === 'manager' && route === 'team' && <TeamDashboard user={user} onOpenReview={(id) => { setReviewEmp(id); setRoute('review'); }} />}
            {user.role === 'manager' && route === 'review' && <GoalReview user={user} selectedEmployeeId={reviewEmp} />}
            {user.role === 'manager' && route === 'checkin' && <CheckIn user={user} />}
            {user.role === 'admin' && route === 'dashboard' && <Dashboard />}
            {user.role === 'admin' && route === 'audit' && <AuditLog />}
            {user.role === 'admin' && route === 'shared' && <SharedGoalPush />}
            {user.role === 'admin' && route === 'export' && <ExportReport />}
          </main>
          <RoleSwitcher onSwitch={handleSwitch} currentId={userId} />
        </div>
      )}
    </ToastProvider>
  );
}
