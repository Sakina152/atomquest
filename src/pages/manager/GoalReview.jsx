import { useMemo, useState } from 'react';
import { USERS, GOAL_SHEETS, GOALS, ACHIEVEMENTS } from '../../lib/mockData';
import { computeScore, scoreColor } from '../../lib/scoring';
import StatusBadge from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';
import { Check, X, Share2 } from 'lucide-react';

export default function GoalReview({ user, selectedEmployeeId }) {
    const reports = USERS.filter((u) => u.manager === user.id);
    const [empId, setEmpId] = useState(selectedEmployeeId || reports[0]?.id);
    const sheet = GOAL_SHEETS.find((s) => s.employee_id === empId);
    const [status, setStatus] = useState(sheet?.status);
    const [goals, setGoals] = useState(() => (sheet ? GOALS.filter((g) => g.sheet_id === sheet.id) : []));
    const [comment, setComment] = useState('');
    const { push } = useToast();

    const achById = useMemo(() => {
        const m = {}; ACHIEVEMENTS.forEach((a) => { m[a.goal_id] = a; }); return m;
    }, []);

    // SUPABASE: update goal_sheets set status='approved', approved_by, approved_at
    const handleApproveSheet = async () => { setStatus('approved'); push('Sheet approved'); };
    // SUPABASE: update goal_sheets set status='draft' + insert checkin comment
    const handleReturnSheet = async () => { setStatus('draft'); push('Sheet returned for rework', 'info'); };
    // SUPABASE: update goals set [field]=value
    const handleInlineEdit = async (goalId, field, value) => {
        setGoals((gs) => gs.map((g) => (g.id === goalId ? { ...g, [field]: value } : g)));
    };

    const switchEmp = (id) => {
        setEmpId(id);
        const s = GOAL_SHEETS.find((x) => x.employee_id === id);
        setStatus(s?.status);
        setGoals(s ? GOALS.filter((g) => g.sheet_id === s.id) : []);
    };

    const isEditable = status === 'submitted';

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Goal Review</h1>
                    <p className="text-slate-500 mt-1">Approve, return, or correct goal sheets inline.</p>
                </div>
                <select value={empId} onChange={(e) => switchEmp(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg">
                    {reports.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
            </div>

            {!sheet ? (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-6 text-amber-800">No goal sheet found for this employee.</div>
            ) : (
                <>
                    <div className="flex items-center gap-3 mb-4">
                        <StatusBadge status={status} />
                        <span className="text-sm text-slate-500">{goals.length} goals</span>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto max-h-[55vh] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 sticky top-0">
                                    <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                                        <th className="px-4 py-3">Goal</th>
                                        <th className="px-4 py-3">Submitted Target</th>
                                        <th className="px-4 py-3">Corrected Target</th>
                                        <th className="px-4 py-3">Submitted Weight</th>
                                        <th className="px-4 py-3">Corrected Weight</th>
                                        <th className="px-4 py-3">Q1 Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {goals.map((g) => {
                                        const a = achById[g.id];
                                        const score = a ? computeScore(g, a) : null;
                                        return (
                                            <tr key={g.id} className={g.is_shared ? 'border-l-4 border-purple-400' : ''}>
                                                <td className="px-4 py-3 font-medium text-slate-900">
                                                    {g.is_shared && <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded mr-1"><Share2 className="w-3 h-3" /> Shared</span>}
                                                    {g.title}<div className="text-xs text-slate-500">{g.thrust}</div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">{g.uom === 'timeline' ? g.target_date : g.target}</td>
                                                <td className="px-4 py-3">
                                                    {g.uom === 'timeline' ? (
                                                        <input type="date" disabled={!isEditable} value={g.target_date || ''} onChange={(e) => handleInlineEdit(g.id, 'target_date', e.target.value)} className="px-2 py-1 border border-gray-200 rounded disabled:bg-gray-50" />
                                                    ) : (
                                                        <input type="number" disabled={!isEditable} value={g.target} onChange={(e) => handleInlineEdit(g.id, 'target', Number(e.target.value))} className="w-28 px-2 py-1 border border-gray-200 rounded disabled:bg-gray-50" />
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">{g.weightage}%</td>
                                                <td className="px-4 py-3">
                                                    <input type="number" disabled={!isEditable} value={g.weightage} onChange={(e) => handleInlineEdit(g.id, 'weightage', Number(e.target.value))} className="w-20 px-2 py-1 border border-gray-200 rounded disabled:bg-gray-50" />
                                                </td>
                                                <td className="px-4 py-3">{score !== null ? <span className={`px-2 py-0.5 text-xs font-bold rounded ${scoreColor(score)}`}>{score.toFixed(0)}%</span> : <span className="text-slate-400 text-xs">—</span>}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {isEditable && (
                        <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <label className="text-sm font-medium text-slate-700 mb-1 block">Feedback comment (required when returning)</label>
                            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Share feedback for the employee..." />
                            <div className="mt-3 flex flex-wrap gap-2 justify-end">
                                <button onClick={handleReturnSheet} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 font-medium text-sm"><X className="w-4 h-4" /> Return for Rework</button>
                                <button onClick={handleApproveSheet} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium text-sm"><Check className="w-4 h-4" /> Approve Sheet</button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
