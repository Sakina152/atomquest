import { useState, useEffect } from 'react';
import { QUARTER_WINDOWS, isWindowOpen } from '../../lib/mockData';
import { computeScore, scoreColor } from '../../lib/scoring';
import { useToast } from '../../components/Toast';
import { supabase } from '../../lib/supabase';
import { Lock, Loader2, Save } from 'lucide-react';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function AchievementTracker({ user, profile }) {
    const [sheet, setSheet] = useState(null);
    const [goals, setGoals] = useState([]);
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeQ, setActiveQ] = useState('Q1');
    const { push } = useToast();

    // ─── SUPABASE: load sheet + goals + all achievements ────────────────────────
    useEffect(() => {
        if (!profile?.id) return;
        loadData();
    }, [profile]);

    const loadData = async () => {
        setLoading(true);
        try {
            const { data: sheets } = await supabase
                .from('goal_sheets')
                .select('*')
                .eq('employee_id', profile.id)
                .eq('cycle_year', 2026);
            const currentSheet = sheets?.[0];
            setSheet(currentSheet);
            if (!currentSheet) return;

            const { data: goalsData } = await supabase
                .from('goals')
                .select('*')
                .eq('sheet_id', currentSheet.id);
            setGoals(goalsData || []);

            if (goalsData?.length) {
                const { data: achData } = await supabase
                    .from('achievements')
                    .select('*')
                    .in('goal_id', goalsData.map((g) => g.id));
                const map = {};
                achData?.forEach((a) => {
                    map[`${a.goal_id}_${a.quarter}`] = {
                        id: a.id,
                        actual: a.actual_value,
                        status: a.status,
                    };
                });
                setData(map);
            }
        } catch (err) {
            push('Failed to load: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // local state update while typing
    const handleChange = (goalId, quarter, payload) => {
        setData((d) => ({
            ...d,
            [`${goalId}_${quarter}`]: { ...d[`${goalId}_${quarter}`], ...payload },
        }));
    };

    // ─── SUPABASE: upsert into achievements ─────────────────────────────────────
    const handleSaveQuarter = async () => {
        setSaving(true);
        try {
            const upserts = goals.map((g) => {
                const key = `${g.id}_${activeQ}`;
                const d = data[key] || {};
                return {
                    ...(d.id ? { id: d.id } : {}),
                    goal_id: g.id,
                    quarter: activeQ,
                    actual_value: d.actual ?? null,
                    status: d.status || 'not_started',
                };
            });

            const { error } = await supabase
                .from('achievements')
                .upsert(upserts, { onConflict: 'goal_id,quarter' });
            if (error) throw error;

            push(`${activeQ} actuals saved!`, 'success');
            await loadData(); // refresh to get DB-generated ids
        } catch (err) {
            push('Save failed: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const isApproved = sheet?.status === 'approved' || sheet?.status === 'locked';

    if (loading) {
        return (
            <div className="p-8 max-w-4xl mx-auto space-y-4 animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-64" />
                <div className="h-48 bg-gray-100 rounded-xl" />
                <div className="h-48 bg-gray-100 rounded-xl" />
            </div>
        );
    }

    if (!sheet || !isApproved) {
        return (
            <div className="p-8 max-w-4xl mx-auto">
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-6 text-amber-800">
                    Achievement tracker is available once your goal sheet is approved.
                </div>
            </div>
        );
    }

    const windowOpen = isWindowOpen(activeQ);

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Achievement Tracker</h1>
                <p className="text-slate-500 mt-1">Record actuals for each quarter.</p>
            </div>

            {/* Quarter tabs */}
            <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200">
                {QUARTERS.map((q) => (
                    <button
                        key={q}
                        onClick={() => setActiveQ(q)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 ${activeQ === q ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        {q} {!isWindowOpen(q) && <Lock className="w-3 h-3" />}
                    </button>
                ))}
            </div>

            {!windowOpen && (
                <div className="mb-4 bg-gray-100 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg text-sm">
                    Window closed — {activeQ} runs {QUARTER_WINDOWS[activeQ]?.open} → {QUARTER_WINDOWS[activeQ]?.close}
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
                {!windowOpen && <div className="absolute inset-0 bg-gray-100/40 z-10 pointer-events-none" />}
                <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0">
                            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                                <th className="px-4 py-3">Goal</th>
                                <th className="px-4 py-3">Target</th>
                                <th className="px-4 py-3">Actual</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {goals.map((g) => {
                                const key = `${g.id}_${activeQ}`;
                                const d = data[key] || { actual: '', status: 'not_started' };
                                const score = computeScore(g, d);
                                return (
                                    <tr key={g.id}>
                                        <td className="px-4 py-3 font-medium text-slate-900">
                                            {g.title}
                                            <div className="text-xs text-slate-500">{g.thrust_area}</div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">
                                            {(g.uom_type) === 'timeline' ? g.target_date : g.target_value}
                                        </td>
                                        <td className="px-4 py-3">
                                            {g.uom_type === 'timeline' ? (
                                                <span className="text-xs text-slate-500">Use status →</span>
                                            ) : (
                                                <input
                                                    type="number"
                                                    disabled={!windowOpen}
                                                    value={d.actual ?? ''}
                                                    onChange={(e) => handleChange(g.id, activeQ, { actual: Number(e.target.value) })}
                                                    className="w-32 px-2 py-1 rounded border border-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                                />
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                disabled={!windowOpen}
                                                value={d.status || 'not_started'}
                                                onChange={(e) => handleChange(g.id, activeQ, { status: e.target.value })}
                                                className="px-2 py-1 rounded border border-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                            >
                                                <option value="not_started">Not started</option>
                                                <option value="on_track">On track</option>
                                                <option value="at_risk">At risk</option>
                                                <option value="completed">Completed</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 text-xs font-bold rounded ${scoreColor(score)}`}>
                                                {score.toFixed(0)}%
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-4 flex justify-end">
                <button
                    disabled={!windowOpen || saving}
                    onClick={handleSaveQuarter}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save {activeQ}
                </button>
            </div>
        </div>
    );
}