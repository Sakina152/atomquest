import { useState, useEffect } from 'react';
import { weightedFinal } from '../../lib/scoring';
import StatusBadge from '../../components/StatusBadge';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';
import { Users, CheckCircle2, Clock, FileEdit } from 'lucide-react';

export default function Dashboard({ profile }) {
    const [employees, setEmployees] = useState([]);
    const [sheets, setSheets] = useState({});
    const [goals, setGoals] = useState({});
    const [achievements, setAchievements] = useState({});
    const [managers, setManagers] = useState({});
    const [loading, setLoading] = useState(true);
    const { push } = useToast();

    // ─── SUPABASE: load all employees + sheets + goals + achievements ────────────
    useEffect(() => {
        if (!profile?.id) return;
        loadDashboard();
    }, [profile]);

    const loadDashboard = async () => {
        setLoading(true);
        try {
            // all profiles
            const { data: profilesData } = await supabase
                .from('profiles')
                .select('*');

            const emps = profilesData?.filter((p) => p.role === 'employee') || [];
            setEmployees(emps);

            // manager map
            const mgrMap = {};
            profilesData?.forEach((p) => { mgrMap[p.id] = p; });
            setManagers(mgrMap);

            if (!emps.length) return;

            // all goal sheets
            const { data: sheetData } = await supabase
                .from('goal_sheets')
                .select('*')
                .eq('cycle_year', 2026);

            const sheetMap = {};
            sheetData?.forEach((s) => { sheetMap[s.employee_id] = s; });
            setSheets(sheetMap);

            if (!sheetData?.length) return;

            // all goals
            const { data: goalsData } = await supabase
                .from('goals')
                .select('*')
                .in('sheet_id', sheetData.map((s) => s.id));

            const goalsMap = {};
            goalsData?.forEach((g) => {
                if (!goalsMap[g.sheet_id]) goalsMap[g.sheet_id] = [];
                goalsMap[g.sheet_id].push(g);
            });
            setGoals(goalsMap);

            if (!goalsData?.length) return;

            // all achievements
            const { data: achData } = await supabase
                .from('achievements')
                .select('*')
                .in('goal_id', goalsData.map((g) => g.id));

            const achMap = {};
            achData?.forEach((a) => { achMap[a.goal_id] = a; });
            setAchievements(achMap);

        } catch (err) {
            push('Failed to load dashboard: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const approved = Object.values(sheets).filter((s) => s.status === 'approved').length;
    const submitted = Object.values(sheets).filter((s) => s.status === 'submitted').length;
    const draft = Object.values(sheets).filter((s) => s.status === 'draft').length;

    const cards = [
        { label: 'Employees', value: employees.length, icon: Users, color: 'from-indigo-500 to-blue-500' },
        { label: 'Approved', value: approved, icon: CheckCircle2, color: 'from-green-500 to-emerald-500' },
        { label: 'Awaiting Review', value: submitted, icon: Clock, color: 'from-amber-500 to-orange-500' },
        { label: 'In Draft', value: draft, icon: FileEdit, color: 'from-slate-500 to-slate-700' },
    ];

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-48" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-gray-100 rounded-xl" />)}
                </div>
                <div className="h-64 bg-gray-100 rounded-xl" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Admin Dashboard</h1>
                <p className="text-slate-500 mt-1">Cycle 2026 — organisation overview</p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {cards.map((c) => {
                    const Icon = c.icon;
                    return (
                        <div key={c.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${c.color} flex items-center justify-center mb-3`}>
                                <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-2xl font-bold text-slate-900">{c.value}</div>
                            <div className="text-xs uppercase text-slate-500 font-semibold mt-1">{c.label}</div>
                        </div>
                    );
                })}
            </div>

            {/* Completion grid */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-200">
                    <h2 className="font-semibold text-slate-900">Completion Grid</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0">
                            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                                <th className="px-4 py-3">Employee</th>
                                <th className="px-4 py-3">Manager</th>
                                <th className="px-4 py-3">Sheet Status</th>
                                <th className="px-4 py-3">Goals</th>
                                <th className="px-4 py-3">YTD Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {employees.map((e) => {
                                const sheet = sheets[e.id];
                                const sheetGoals = sheet ? (goals[sheet.id] || []) : [];
                                const score = sheetGoals.length ? weightedFinal(sheetGoals, achievements) : 0;
                                const mgr = managers[e.manager_id];
                                return (
                                    <tr key={e.id}>
                                        <td className="px-4 py-3 font-medium text-slate-900">{e.full_name}</td>
                                        <td className="px-4 py-3 text-slate-700">{mgr?.full_name || '—'}</td>
                                        <td className="px-4 py-3">
                                            {sheet ? <StatusBadge status={sheet.status} /> : <span className="text-slate-400">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">{sheetGoals.length}</td>
                                        <td className="px-4 py-3 font-semibold text-indigo-600">{score.toFixed(0)}%</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}