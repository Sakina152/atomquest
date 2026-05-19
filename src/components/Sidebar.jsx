import { useState } from 'react';
import { Target, TrendingUp, Users, ClipboardCheck, MessageSquare, LayoutDashboard, FileText, Share2, Download, LogOut, Menu, X } from 'lucide-react';

const NAVS = {
    employee: [
        { key: 'goalsheet', label: 'My Goal Sheet', icon: Target },
        { key: 'tracker', label: 'Achievement Tracker', icon: TrendingUp },
    ],
    manager: [
        { key: 'team', label: 'Team Dashboard', icon: Users },
        { key: 'review', label: 'Goal Review', icon: ClipboardCheck },
        { key: 'checkin', label: 'Check-In', icon: MessageSquare },
    ],
    admin: [
        { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { key: 'audit', label: 'Audit Log', icon: FileText },
        { key: 'shared', label: 'Shared Goal Push', icon: Share2 },
        { key: 'export', label: 'Export Report', icon: Download },
    ],
};

export default function Sidebar({ user, profile, active, onNavigate, onLogout }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const items = NAVS[user.role] || [];

    // use real profile name if available, fall back to mock user name
    const displayName = profile?.full_name || user.name;
    const initials = displayName.split(' ').map((n) => n[0]).join('');

    const content = (
        <div className="h-full bg-slate-900 text-white flex flex-col w-64">
            <div className="px-5 py-6 border-b border-slate-800">
                <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold">A</div>
                    <span className="font-bold text-lg">AtomQuest</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                        {initials}
                    </div>
                    <div>
                        <div className="font-semibold text-sm">{displayName}</div>
                        <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded bg-slate-700 text-slate-200">
                            {profile?.role || user.role}
                        </span>
                    </div>
                </div>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {items.map((it) => {
                    const Icon = it.icon;
                    const isActive = active === it.key;
                    return (
                        <button
                            key={it.key}
                            onClick={() => { onNavigate(it.key); setMobileOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                        >
                            <Icon className="w-4 h-4" /> {it.label}
                        </button>
                    );
                })}
            </nav>

            <div className="p-3 border-t border-slate-800">
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                    <LogOut className="w-4 h-4" /> Log out
                </button>
            </div>
        </div>
    );

    return (
        <>
            <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden fixed top-4 left-4 z-40 bg-slate-900 text-white p-2 rounded-lg shadow-lg"
            >
                <Menu className="w-5 h-5" />
            </button>
            <aside className="hidden md:block flex-shrink-0">{content}</aside>
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
                    <div className="relative">
                        <button onClick={() => setMobileOpen(false)} className="absolute -right-10 top-3 text-white">
                            <X />
                        </button>
                        {content}
                    </div>
                </div>
            )}
        </>
    );
}