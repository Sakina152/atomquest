import { useMemo, useState, useEffect } from 'react';
import { Plus, Trash2, Send, RotateCcw, Lock, AlertCircle, Share2, Loader2 } from 'lucide-react';
import { computeScore, scoreColor } from '../../lib/scoring';
import StatusBadge from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';
import { supabase } from '../../lib/supabase';

const UOM_OPTIONS = [
    { value: 'min', label: 'Min (higher = better)' },
    { value: 'max', label: 'Max (lower = better)' },
    { value: 'zero', label: 'Zero tolerance' },
    { value: 'timeline', label: 'Timeline / Milestone' },
];

const THRUST_OPTIONS = [
    'Revenue Growth', 'Retention', 'Product Delivery',
    'Reliability', 'People', 'Governance', 'Customer Success', 'Innovation',
];

export default function GoalSheet({ user, profile }) {
    const [sheet, setSheet] = useState(null);
    const [goals, setGoals] = useState([]);
    const [achievements, setAchievements] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { push } = useToast();

    const totalWeight = useMemo(() => goals.reduce((s, g) => s + Number(g.weightage || 0), 0), [goals]);
    const readOnly = sheet?.status !== 'draft';

    // ─── SUPABASE: load sheet + goals + achievements on mount ───────────────────
    useEffect(() => {
        if (!profile?.id) return;
        loadSheet();
    }, [profile]);

    const loadSheet = async () => {
        setLoading(true);
        try {
            // fetch or create the goal sheet
            let { data: sheets, error } = await supabase
                .from('goal_sheets')
                .select('*')
                .eq('employee_id', profile.id)
                .eq('cycle_year', 2026);
            if (error) throw error;

            let currentSheet = sheets?.[0];

            // create a draft sheet if none exists
            if (!currentSheet) {
                const { data: newSheet, error: insertError } = await supabase
                    .from('goal_sheets')
                    .insert({ employee_id: profile.id, cycle_year: 2026, status: 'draft' })
                    .select()
                    .single();
                if (insertError) throw insertError;
                currentSheet = newSheet;
            }
            setSheet(currentSheet);

            // fetch goals for this sheet
            const { data: goalsData, error: goalsError } = await supabase
                .from('goals')
                .select('*')
                .eq('sheet_id', currentSheet.id);
            if (goalsError) throw goalsError;
            setGoals(goalsData || []);

            // fetch Q1 achievements for all goals
            if (goalsData?.length) {
                const goalIds = goalsData.map((g) => g.id);
                const { data: achData } = await supabase
                    .from('achievements')
                    .select('*')
                    .in('goal_id', goalIds);
                const map = {};
                achData?.forEach((a) => { map[a.goal_id] = a; });
                setAchievements(map);
            }
        } catch (err) {
            push('Failed to load goal sheet: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // ─── SUPABASE: insert into goals ────────────────────────────────────────────
    const handleAddGoal = async () => {
        if (goals.length >= 8) {
            push('Maximum 8 goals allowed', 'error'); return;
        }
        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('goals')
                .insert({
                    sheet_id: sheet.id,
                    title: 'New Goal',
                    thrust_area: 'Revenue Growth',
                    uom_type: 'min',
                    target_value: 0,
                    weightage: 10,
                    is_shared: false,
                })
                .select()
                .single();
            if (error) throw error;
            setGoals((g) => [...g, data]);
            push('Goal added successfully');
        } catch (err) {
            push('Failed to add goal: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    // ─── SUPABASE: update goals set ... where id=goalId ─────────────────────────
    const handleUpdateGoal = async (goalId, updates) => {
        // optimistic UI update first
        setGoals((gs) => gs.map((g) => (g.id === goalId ? { ...g, ...updates } : g)));

        // map frontend field names to DB column names
        const dbUpdates = {};
        if ('title' in updates) dbUpdates.title = updates.title;
        if ('thrust' in updates) dbUpdates.thrust_area = updates.thrust;
        if ('thrust_area' in updates) dbUpdates.thrust_area = updates.thrust_area;
        if ('uom' in updates) dbUpdates.uom_type = updates.uom;
        if ('uom_type' in updates) dbUpdates.uom_type = updates.uom_type;
        if ('target' in updates) dbUpdates.target_value = updates.target;
        if ('target_value' in updates) dbUpdates.target_value = updates.target_value;
        if ('target_date' in updates) dbUpdates.target_date = updates.target_date;
        if ('weightage' in updates) dbUpdates.weightage = updates.weightage;
        if ('description' in updates) dbUpdates.description = updates.description;

        const { error } = await supabase
            .from('goals')
            .update(dbUpdates)
            .eq('id', goalId);
        if (error) push('Failed to save: ' + error.message, 'error');

        // check if weightage just hit 100%
        const updated = goals.map((g) => (g.id === goalId ? { ...g, ...updates } : g));
        const total = updated.reduce((s, g) => s + Number(g.weightage || 0), 0);
        if (total === 100 && totalWeight !== 100) push('Weightage at 100% — Ready to submit!', 'success');
    };

    // ─── SUPABASE: delete from goals where id=goalId ────────────────────────────
    const handleDeleteGoal = async (goalId) => {
        setGoals((gs) => gs.filter((g) => g.id !== goalId));
        const { error } = await supabase
            .from('goals')
            .delete()
            .eq('id', goalId);
        if (error) push('Failed to delete: ' + error.message, 'error');
        else push('Goal removed', 'info');
    };

    // ─── SUPABASE: update goal_sheets set status='submitted' ────────────────────
    const handleSubmitSheet = async () => {
        // Hard validation — re-check all rules before submitting
        if (goals.length === 0) { push('Add at least one goal before submitting', 'error'); return; }
        if (totalWeight !== 100) { push(`Total weightage must be 100% (currently ${totalWeight}%)`, 'error'); return; }
        const belowMin = goals.find((g) => Number(g.weightage) < 10);
        if (belowMin) { push(`"${belowMin.title}" has less than 10% weightage (minimum is 10%)`, 'error'); return; }
        if (goals.length > 8) { push('Maximum 8 goals allowed', 'error'); return; }

        setSaving(true);
        const { error } = await supabase
            .from('goal_sheets')
            .update({ status: 'submitted' })
            .eq('id', sheet.id);
        if (error) { push('Submit failed: ' + error.message, 'error'); setSaving(false); return; }
        setSheet((s) => ({ ...s, status: 'submitted' }));
        push('Sheet submitted for approval!', 'success');
        setSaving(false);
    };

    // ─── SUPABASE: update goal_sheets set status='draft' ────────────────────────
    const handleRecallDraft = async () => {
        setSaving(true);
        const { error } = await supabase
            .from('goal_sheets')
            .update({ status: 'draft' })
            .eq('id', sheet.id);
        if (error) { push('Recall failed: ' + error.message, 'error'); setSaving(false); return; }
        setSheet((s) => ({ ...s, status: 'draft' }));
        push('Draft recalled', 'info');
        setSaving(false);
    };

    // ─── Loading state ───────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-64" />
                    <div className="h-4 bg-gray-100 rounded w-32" />
                    <div className="h-48 bg-gray-100 rounded-xl" />
                    <div className="h-48 bg-gray-100 rounded-xl" />
                    <div className="h-48 bg-gray-100 rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">My Goal Sheet</h1>
                    <p className="text-slate-500 mt-1">Cycle Year {sheet?.cycle_year}</p>
                </div>
                <div className="flex items-center gap-3">
                    <StatusBadge status={sheet?.status} />
                    {readOnly && (
                        <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded border border-blue-300">
                            <Lock className="w-3 h-3" /> Locked by manager
                        </span>
                    )}
                </div>
            </div>

            {sheet?.status === 'submitted' && (
                <div className="mb-4 bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> Awaiting manager approval
                </div>
            )}

            {/* Weightage bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Total Weightage</span>
                    <span className={`text-sm font-bold ${totalWeight === 100 ? 'text-green-700' : totalWeight > 100 ? 'text-red-600' : 'text-amber-700'}`}>
                        {totalWeight}%
                    </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 ease-out ${totalWeight === 100 ? 'bg-green-500' : totalWeight > 100 ? 'bg-red-500' : 'bg-amber-400'}`}
                        style={{ width: `${Math.min(totalWeight, 100)}%` }}
                    />
                </div>
                {totalWeight !== 100 && !readOnly && (
                    <p className="text-xs text-slate-500 mt-2">Weightage must total exactly 100% to submit.</p>
                )}
            </div>

            {/* Goals table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0 z-10">
                            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                                <th className="px-4 py-3">Goal</th>
                                <th className="px-4 py-3">Thrust Area</th>
                                <th className="px-4 py-3">UoM</th>
                                <th className="px-4 py-3">Target</th>
                                <th className="px-4 py-3">Weight %</th>
                                <th className="px-4 py-3">Q1 Score</th>
                                <th className="px-4 py-3 w-10" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {goals.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                                        No goals yet. Click "Add Goal" to start.
                                    </td>
                                </tr>
                            )}
                            {goals.map((g) => {
                                const ach = achievements[g.id];
                                const score = ach ? computeScore(g, ach) : null;
                                const lockField = readOnly || g.is_shared;
                                return (
                                    <tr key={g.id} className={g.is_shared ? 'border-l-4 border-purple-400' : ''}>
                                        <td className="px-4 py-3 min-w-[200px]">
                                            {g.is_shared && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded mb-1">
                                                    <Share2 className="w-3 h-3" /> Shared KPI
                                                </span>
                                            )}
                                            <input
                                                value={g.title}
                                                onChange={(e) => handleUpdateGoal(g.id, { title: e.target.value })}
                                                disabled={lockField}
                                                className={`w-full px-2 py-1 rounded border border-transparent hover:border-gray-200 focus:border-indigo-400 focus:outline-none ${lockField ? 'bg-gray-50 cursor-not-allowed opacity-75' : ''}`}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={g.thrust_area || g.thrust || ''}
                                                onChange={(e) => handleUpdateGoal(g.id, { thrust_area: e.target.value })}
                                                disabled={lockField}
                                                className={`px-2 py-1 rounded border border-gray-200 focus:border-indigo-400 focus:outline-none ${lockField ? 'bg-gray-50 cursor-not-allowed opacity-75' : ''}`}
                                            >
                                                {THRUST_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={g.uom_type || g.uom || 'min'}
                                                onChange={(e) => handleUpdateGoal(g.id, { uom_type: e.target.value })}
                                                disabled={lockField}
                                                className={`px-2 py-1 rounded border border-gray-200 ${lockField ? 'bg-gray-50 cursor-not-allowed opacity-75' : ''}`}
                                            >
                                                {UOM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.value}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            {(g.uom_type || g.uom) === 'timeline' ? (
                                                <input
                                                    type="date"
                                                    value={g.target_date || ''}
                                                    onChange={(e) => handleUpdateGoal(g.id, { target_date: e.target.value })}
                                                    disabled={lockField}
                                                    className={`px-2 py-1 rounded border border-gray-200 ${lockField ? 'bg-gray-50 cursor-not-allowed opacity-75' : ''}`}
                                                />
                                            ) : (
                                                <input
                                                    type="number"
                                                    value={g.target_value ?? g.target ?? 0}
                                                    onChange={(e) => handleUpdateGoal(g.id, { target_value: Number(e.target.value) })}
                                                    disabled={lockField}
                                                    className={`w-28 px-2 py-1 rounded border border-gray-200 ${lockField ? 'bg-gray-50 cursor-not-allowed opacity-75' : ''}`}
                                                />
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number" min={10} max={100}
                                                value={g.weightage}
                                                onChange={(e) => handleUpdateGoal(g.id, { weightage: Number(e.target.value) })}
                                                disabled={readOnly}
                                                className={`w-20 px-2 py-1 rounded border border-gray-200 ${readOnly ? 'bg-gray-50 cursor-not-allowed opacity-75' : ''}`}
                                            />
                                            {Number(g.weightage) < 10 && !readOnly && (
                                                <p className="text-[10px] text-red-500 mt-0.5">Min 10%</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {score !== null
                                                ? <span className={`px-2 py-0.5 text-xs font-bold rounded ${scoreColor(score)}`}>{score.toFixed(0)}%</span>
                                                : <span className="text-xs text-slate-400">—</span>
                                            }
                                        </td>
                                        <td className="px-4 py-3">
                                            {!readOnly && !g.is_shared && (
                                                <button onClick={() => handleDeleteGoal(g.id)} className="text-slate-400 hover:text-red-600">
                                                    <Trash2 className="w-4 h-4" />
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

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-3 justify-between items-center">
                <p className="text-xs text-slate-400">{goals.length}/8 goals</p>
                <div className="flex gap-3">
                    {sheet?.status === 'draft' && (
                        <>
                            <button
                                onClick={handleAddGoal}
                                disabled={saving || goals.length >= 8}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 font-medium text-sm"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Add Goal
                            </button>
                            <button
                                disabled={totalWeight !== 100 || goals.length === 0 || saving}
                                onClick={handleSubmitSheet}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium text-sm"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Submit for Approval
                            </button>
                        </>
                    )}
                    {sheet?.status === 'submitted' && (
                        <button
                            onClick={handleRecallDraft}
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 font-medium text-sm"
                        >
                            <RotateCcw className="w-4 h-4" /> Recall Draft
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}