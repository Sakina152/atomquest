import { useMemo, useState } from 'react';
import { Plus, Trash2, Send, RotateCcw, Lock, AlertCircle, Share2 } from 'lucide-react';
import { GOALS as SEED_GOALS, GOAL_SHEETS, ACHIEVEMENTS } from '../../lib/mockData';
import { computeScore, scoreColor } from '../../lib/scoring';
import StatusBadge from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';

const UOM_OPTIONS = [
    { value: 'min', label: 'Min (higher = better)' },
    { value: 'max', label: 'Max (lower = better)' },
    { value: 'zero', label: 'Zero tolerance' },
    { value: 'timeline', label: 'Timeline / Milestone' },
];

export default function GoalSheet({ user }) {
    const sheet = GOAL_SHEETS.find((s) => s.employee_id === user.id) || { id: 'snew', employee_id: user.id, cycle_year: 2026, status: 'draft' };
    const initialGoals = sheet.id === 's1' ? SEED_GOALS : [];
    const [goals, setGoals] = useState(initialGoals);
    const [sheetStatus, setSheetStatus] = useState(sheet.status);
    const { push } = useToast();

    const totalWeight = useMemo(() => goals.reduce((s, g) => s + Number(g.weightage || 0), 0), [goals]);
    const readOnly = sheetStatus !== 'draft';

    const achievementsById = useMemo(() => {
        const m = {};
        ACHIEVEMENTS.forEach((a) => { m[a.goal_id] = a; });
        return m;
    }, []);

    // SUPABASE: insert into goals table
    const handleAddGoal = async (goalData) => {
        const newGoal = { id: 'g' + Math.random().toString(36).slice(2, 7), sheet_id: sheet.id, title: '', thrust: '', uom: 'min', target: 0, weightage: 0, is_shared: false, ...goalData };
        setGoals((g) => [...g, newGoal]);
        push('Goal added successfully');
    };
    // SUPABASE: update goals set ... where id=goalId
    const handleUpdateGoal = async (goalId, updates) => {
        setGoals((gs) => gs.map((g) => (g.id === goalId ? { ...g, ...updates } : g)));
        const next = goals.map((g) => (g.id === goalId ? { ...g, ...updates } : g));
        const total = next.reduce((s, g) => s + Number(g.weightage || 0), 0);
        if (total === 100 && totalWeight !== 100) push('Weightage at 100% — Ready to submit!', 'success');
    };
    // SUPABASE: delete from goals where id=goalId
    const handleDeleteGoal = async (goalId) => {
        setGoals((gs) => gs.filter((g) => g.id !== goalId));
        push('Goal removed', 'info');
    };
    // SUPABASE: update goal_sheets set status='submitted'
    const handleSubmitSheet = async () => {
        setSheetStatus('submitted');
        push('Sheet submitted for approval');
    };
    // SUPABASE: update goal_sheets set status='draft'
    const handleRecallDraft = async () => {
        setSheetStatus('draft');
        push('Draft recalled', 'info');
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">My Goal Sheet</h1>
                    <p className="text-slate-500 mt-1">Cycle Year {sheet.cycle_year}</p>
                </div>
                <div className="flex items-center gap-3">
                    <StatusBadge status={sheetStatus} />
                    {readOnly && <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded border border-blue-300"><Lock className="w-3 h-3" /> Locked by manager</span>}
                </div>
            </div>

            {sheetStatus === 'submitted' && (
                <div className="mb-4 bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> Awaiting manager approval
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Total Weightage</span>
                    <span className={`text-sm font-bold ${totalWeight === 100 ? 'text-green-700' : totalWeight > 100 ? 'text-red-600' : 'text-amber-700'}`}>{totalWeight}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ease-out ${totalWeight === 100 ? 'bg-green-500' : totalWeight > 100 ? 'bg-red-500' : 'bg-amber-400'}`} style={{ width: `${Math.min(totalWeight, 100)}%` }} />
                </div>
                {totalWeight !== 100 && !readOnly && <p className="text-xs text-slate-500 mt-2">Weightage must total exactly 100% to submit.</p>}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0 z-10">
                            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                                <th className="px-4 py-3">Goal</th>
                                <th className="px-4 py-3">Thrust</th>
                                <th className="px-4 py-3">UoM</th>
                                <th className="px-4 py-3">Target</th>
                                <th className="px-4 py-3">Weight %</th>
                                <th className="px-4 py-3">Q1 Score</th>
                                <th className="px-4 py-3 w-10" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {goals.length === 0 && (
                                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No goals yet. Click "Add Goal" to start.</td></tr>
                            )}
                            {goals.map((g) => {
                                const ach = achievementsById[g.id];
                                const score = ach ? computeScore(g, ach) : null;
                                const lockField = readOnly || g.is_shared;
                                return (
                                    <tr key={g.id} className={g.is_shared ? 'border-l-4 border-purple-400' : ''}>
                                        <td className="px-4 py-3">
                                            {g.is_shared && <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded mb-1"><Share2 className="w-3 h-3" /> Shared KPI</span>}
                                            <input value={g.title} onChange={(e) => handleUpdateGoal(g.id, { title: e.target.value })} disabled={lockField} className={`w-full px-2 py-1 rounded border border-transparent hover:border-gray-200 focus:border-indigo-400 focus:outline-none ${lockField ? 'bg-gray-50 cursor-not-allowed opacity-75' : ''}`} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input value={g.thrust} onChange={(e) => handleUpdateGoal(g.id, { thrust: e.target.value })} disabled={lockField} className={`w-32 px-2 py-1 rounded border border-transparent hover:border-gray-200 focus:border-indigo-400 focus:outline-none ${lockField ? 'bg-gray-50 cursor-not-allowed opacity-75' : ''}`} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <select value={g.uom} onChange={(e) => handleUpdateGoal(g.id, { uom: e.target.value })} disabled={lockField} className={`px-2 py-1 rounded border border-gray-200 focus:border-indigo-400 focus:outline-none ${lockField ? 'bg-gray-50 cursor-not-allowed opacity-75' : ''}`}>
                                                {UOM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.value}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            {g.uom === 'timeline' ? (
                                                <input type="date" value={g.target_date || ''} onChange={(e) => handleUpdateGoal(g.id, { target_date: e.target.value })} disabled={lockField} className={`px-2 py-1 rounded border border-gray-200 ${lockField ? 'bg-gray-50 cursor-not-allowed opacity-75' : ''}`} />
                                            ) : (
                                                <input type="number" value={g.target ?? 0} onChange={(e) => handleUpdateGoal(g.id, { target: Number(e.target.value) })} disabled={lockField} className={`w-28 px-2 py-1 rounded border border-gray-200 ${lockField ? 'bg-gray-50 cursor-not-allowed opacity-75' : ''}`} />
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <input type="number" min={0} max={100} value={g.weightage} onChange={(e) => handleUpdateGoal(g.id, { weightage: Number(e.target.value) })} disabled={readOnly} className={`w-20 px-2 py-1 rounded border border-gray-200 ${readOnly ? 'bg-gray-50 cursor-not-allowed opacity-75' : ''}`} />
                                        </td>
                                        <td className="px-4 py-3">
                                            {score !== null ? (
                                                <span className={`px-2 py-0.5 text-xs font-bold rounded ${scoreColor(score)}`}>{score.toFixed(0)}%</span>
                                            ) : <span className="text-xs text-slate-400">—</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            {!readOnly && !g.is_shared && (
                                                <button onClick={() => handleDeleteGoal(g.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 justify-end">
                {sheetStatus === 'draft' && (
                    <>
                        <button onClick={() => handleAddGoal({})} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 font-medium text-sm">
                            <Plus className="w-4 h-4" /> Add Goal
                        </button>
                        <button disabled={totalWeight !== 100 || goals.length === 0} onClick={handleSubmitSheet} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium text-sm">
                            <Send className="w-4 h-4" /> Submit for Approval
                        </button>
                    </>
                )}
                {sheetStatus === 'submitted' && (
                    <button onClick={handleRecallDraft} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 font-medium text-sm">
                        <RotateCcw className="w-4 h-4" /> Recall Draft
                    </button>
                )}
            </div>
        </div>
    );
}
