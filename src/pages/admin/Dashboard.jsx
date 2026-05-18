import { USERS, GOAL_SHEETS, GOALS, ACHIEVEMENTS } from '../../lib/mockData';
import { weightedFinal } from '../../lib/scoring';
import StatusBadge from '../../components/StatusBadge';
import { Users, CheckCircle2, Clock, FileEdit } from 'lucide-react';

export default function Dashboard() {
    const employees = USERS.filter((u) => u.role === 'employee');
    const total = employees.length;
    const approved = GOAL_SHEETS.filter((s) => s.status === 'approved').length;
    const submitted = GOAL_SHEETS.filter((s) => s.status === 'submitted').length;
    const draft = GOAL_SHEETS.filter((s) => s.status === 'draft').length;

    const achById = {}; ACHIEVEMENTS.forEach((a) => { achById[a.goal_id] = a; });

    const cards = [
        { label: 'Employees', value: total, icon: Users, color: 'from-indigo-500 to-blue-500' },
        { label: 'Approved', value: approved, icon: CheckCircle2, color: 'from-green-500 to-emerald-500' },
        { label: 'Awaiting Review', value: submitted, icon: Clock, color: 'from-amber-500 to-orange-500' },
        { label: 'In Draft', value: draft, icon: FileEdit, color: 'from-slate-500 to-slate-700' },
    ];

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Admin Dashboard</h1>
                <p className="text-slate-500 mt-1">Cycle 2026 — organization overview</p>
            </div>

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

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-200">
                    <h2 className="font-semibold text-slate-900">Completion Grid</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
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
                                const mgr = USERS.find((u) => u.id === e.manager);
                                const sheet = GOAL_SHEETS.find((s) => s.employee_id === e.id);
                                const goals = sheet ? GOALS.filter((g) => g.sheet_id === sheet.id) : [];
                                const score = goals.length ? weightedFinal(goals, achById) : 0;
                                return (
                                    <tr key={e.id}>
                                        <td className="px-4 py-3 font-medium text-slate-900">{e.name}</td>
                                        <td className="px-4 py-3 text-slate-700">{mgr?.name || '—'}</td>
                                        <td className="px-4 py-3">{sheet ? <StatusBadge status={sheet.status} /> : '—'}</td>
                                        <td className="px-4 py-3 text-slate-700">{goals.length}</td>
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
