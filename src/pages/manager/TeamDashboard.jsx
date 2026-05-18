import { USERS, GOAL_SHEETS, GOALS, ACHIEVEMENTS } from '../../lib/mockData';
import { computeScore, weightedFinal } from '../../lib/scoring';
import StatusBadge from '../../components/StatusBadge';
import { ChevronRight } from 'lucide-react';

export default function TeamDashboard({ user, onOpenReview }) {
    const reports = USERS.filter((u) => u.manager === user.id);
    const achById = {};
    ACHIEVEMENTS.forEach((a) => { achById[a.goal_id] = a; });

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Team Dashboard</h1>
                <p className="text-slate-500 mt-1">{reports.length} direct reports</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports.map((r) => {
                    const sheet = GOAL_SHEETS.find((s) => s.employee_id === r.id);
                    const goals = sheet ? GOALS.filter((g) => g.sheet_id === sheet.id) : [];
                    const final = goals.length ? weightedFinal(goals, achById) : 0;
                    const initials = r.name.split(' ').map((n) => n[0]).join('');
                    return (
                        <button key={r.id} onClick={() => onOpenReview && onOpenReview(r.id)} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-200 transition-all p-5 text-left">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold">{initials}</div>
                                <div className="flex-1">
                                    <div className="font-semibold text-slate-900">{r.name}</div>
                                    <div className="text-xs text-slate-500">{r.email}</div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-400" />
                            </div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs uppercase text-slate-500 font-semibold">Sheet Status</span>
                                {sheet ? <StatusBadge status={sheet.status} /> : <span className="text-xs text-slate-400">No sheet</span>}
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs uppercase text-slate-500 font-semibold">Goals</span>
                                <span className="text-sm font-medium text-slate-900">{goals.length}</span>
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-100">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs uppercase text-slate-500 font-semibold">YTD Score</span>
                                    <span className="text-sm font-bold text-indigo-600">{final.toFixed(0)}%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500" style={{ width: `${final}%` }} />
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
