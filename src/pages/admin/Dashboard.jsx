import { useState, useEffect } from 'react';
import { weightedFinal } from '../../lib/scoring';
import StatusBadge from '../../components/StatusBadge';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';
import { Users, CheckCircle2, Clock, FileEdit, LockOpen, Check, X } from 'lucide-react';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function Dashboard({ profile }) {
    const [employees, setEmployees] = useState([]);
    const [sheets, setSheets] = useState({});
    const [goals, setGoals] = useState({});
    const [achievements, setAchievements] = useState({});
    const [managers, setManagers] = useState({});
    const [checkins, setCheckins] = useState({}); // keyed by sheet_id → set of quarters
    const [unlocking, setUnlocking] = useState(null); // sheet id being unlocked
    const [loading, setLoading] = useState(true);
    const { push } = useToast();

    // ─── SUPABASE: load all employees + sheets + goals + achievements + checkins ──
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

            // manager map (all roles)
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

            const sheetIds = sheetData.map((s) => s.id);

            // all goals
            const { data: goalsData } = await supabase
                .from('goals')
                .select('*')
                .in('sheet_id', sheetIds);

            const goalsMap = {};
            goalsData?.forEach((g) => {
                if (!goalsMap[g.sheet_id]) goalsMap[g.sheet_id] = [];
                goalsMap[g.sheet_id].push(g);
            });
            setGoals(goalsMap);

            if (goalsData?.length) {
                // all achievements
                const { data: achData } = await supabase
                    .from('achievements')
                    .select('*')
                    .in('goal_id', goalsData.map((g) => g.id));

                const achMap = {};
                achData?.forEach((a) => { achMap[a.goal_id] = a; });
                setAchievements(achMap);
            }

            // all check-ins — keyed sheet_id → Set of quarters completed
            const { data: checkinData } = await supabase
                .from('checkins')
                .select('sheet_id, quarter')
                .in('sheet_id', sheetIds);

            const ciMap = {};
            checkinData?.forEach((c) => {
                if (!ciMap[c.sheet_id]) ciMap[c.sheet_id] = new Set();
                ciMap[c.sheet_id].add(c.quarter);
            });
            setCheckins(ciMap);

        } catch (err) {
            push('Failed to load dashboard: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // ─── SUPABASE: unlock a sheet back to draft (Admin override) ─────────────────
    const handleUnlock = async (sheet, empName) => {
        if (!window.confirm(`Unlock ${empName}'s goal sheet? This will set it back to Draft so goals can be edited.`)) return;
        setUnlocking(sheet.id);
        try {
            const { error } = await supabase
                .from('goal_sheets')
                .update({ status: 'draft' })
                .eq('id', sheet.id);
            if (error) throw error;

            // audit log
            await supabase.from('audit_logs').insert({
                entity_type: 'goal_sheets',
                entity_id: sheet.id,
                changed_by: profile.id,
                change_type: 'UNLOCK',
                new_value: { previous_status: sheet.status, unlocked_by: profile.id },
                changed_at: new Date().toISOString(),
            });

            push(`${empName}'s sheet unlocked`, 'success');
            await loadDashboard();
        } catch (err) {
            push('Unlock failed: ' + err.message, 'error');
        } finally {
            setUnlocking(null);
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
                <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-900">Completion Grid</h2>
                    <span className="text-xs text-slate-500">Check-in ✅ = manager comment saved for that quarter</span>
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
                                {QUARTERS.map((q) => (
                                    <th key={q} className="px-3 py-3 text-center">{q}</th>
                                ))}
                                <th className="px-4 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {employees.map((e) => {
                                const sheet = sheets[e.id];
                                const sheetGoals = sheet ? (goals[sheet.id] || []) : [];
                                const score = sheetGoals.length ? weightedFinal(sheetGoals, achievements) : 0;
                                const mgr = managers[e.manager_id];
                                const completedQs = sheet ? (checkins[sheet.id] || new Set()) : new Set();
                                const canUnlock = sheet && (sheet.status === 'approved' || sheet.status === 'submitted');

                                return (
                                    <tr key={e.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-900">{e.full_name}</td>
                                        <td className="px-4 py-3 text-slate-700">{mgr?.full_name || '—'}</td>
                                        <td className="px-4 py-3">
                                            {sheet ? <StatusBadge status={sheet.status} /> : <span className="text-slate-400">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">{sheetGoals.length}</td>
                                        <td className="px-4 py-3 font-semibold text-indigo-600">{score.toFixed(0)}%</td>
                                        {QUARTERS.map((q) => (
                                            <td key={q} className="px-3 py-3 text-center">
                                                {completedQs.has(q)
                                                    ? <Check className="w-4 h-4 text-green-600 mx-auto" />
                                                    : <X className="w-4 h-4 text-slate-300 mx-auto" />
                                                }
                                            </td>
                                        ))}
                                        <td className="px-4 py-3 text-center">
                                            {canUnlock && (
                                                <button
                                                    onClick={() => handleUnlock(sheet, e.full_name)}
                                                    disabled={unlocking === sheet.id}
                                                    title="Unlock sheet for editing"
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                                                >
                                                    <LockOpen className="w-3 h-3" />
                                                    {unlocking === sheet.id ? 'Unlocking…' : 'Unlock'}
                                                </button>
                                            )}
                                        </td>
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