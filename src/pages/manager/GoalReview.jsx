import { useState, useEffect } from 'react';
import { computeScore, scoreColor } from '../../lib/scoring';
import StatusBadge from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';
import { supabase } from '../../lib/supabase';
import { Check, X, Share2, Loader2 } from 'lucide-react';

export default function GoalReview({ user, profile, selectedEmployeeId }) {
    const [reports, setReports] = useState([]);
    const [empId, setEmpId] = useState(selectedEmployeeId || null);
    const [sheet, setSheet] = useState(null);
    const [goals, setGoals] = useState([]);
    const [achievements, setAchievements] = useState({});
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { push } = useToast();

    // ─── SUPABASE: load direct reports on mount ──────────────────────────────────
    useEffect(() => {
        if (!profile?.id) return;
        loadReports();
    }, [profile]);

    const loadReports = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('manager_id', profile.id);
        if (error) { push('Failed to load reports', 'error'); return; }
        setReports(data || []);
        // load the first report's sheet by default
        const firstId = selectedEmployeeId || data?.[0]?.id;
        if (firstId) {
            setEmpId(firstId);
            await loadEmployeeSheet(firstId);
        }
        setLoading(false);
    };

    // ─── SUPABASE: load a specific employee's sheet + goals + achievements ───────
    const loadEmployeeSheet = async (employeeId) => {
        setLoading(true);
        try {
            const { data: sheetData } = await supabase
                .from('goal_sheets')
                .select('*')
                .eq('employee_id', employeeId)
                .eq('cycle_year', 2026)
                .single();
            setSheet(sheetData || null);

            if (!sheetData) { setGoals([]); setLoading(false); return; }

            const { data: goalsData } = await supabase
                .from('goals')
                .select('*')
                .eq('sheet_id', sheetData.id);
            setGoals(goalsData || []);

            if (goalsData?.length) {
                const { data: achData } = await supabase
                    .from('achievements')
                    .select('*')
                    .in('goal_id', goalsData.map((g) => g.id));
                const map = {};
                achData?.forEach((a) => { map[a.goal_id] = a; });
                setAchievements(map);
            }
        } catch (err) {
            push('Failed to load sheet: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const switchEmployee = (id) => {
        setEmpId(id);
        setComment('');
        loadEmployeeSheet(id);
    };

    // ─── SUPABASE: update goals set [field]=value (inline edit) ─────────────────
    const handleInlineEdit = async (goalId, field, value) => {
        // optimistic update
        setGoals((gs) => gs.map((g) => (g.id === goalId ? { ...g, [field]: value } : g)));

        const dbField = field === 'target' ? 'target_value'
            : field === 'uom' ? 'uom_type'
                : field;

        const { error } = await supabase
            .from('goals')
            .update({ [dbField]: value })
            .eq('id', goalId);
        if (error) push('Save failed: ' + error.message, 'error');
    };

    // ─── SUPABASE: approve sheet ─────────────────────────────────────────────────
    const handleApproveSheet = async () => {
        setSaving(true);
        const { error } = await supabase
            .from('goal_sheets')
            .update({
                status: 'approved',
                approved_by: profile.id,
                approved_at: new Date().toISOString(),
            })
            .eq('id', sheet.id);
        if (error) { push('Approve failed: ' + error.message, 'error'); setSaving(false); return; }

        // insert audit log
        await supabase.from('audit_logs').insert({
            entity_type: 'goal_sheets',
            entity_id: sheet.id,
            changed_by: profile.id,
            change_type: 'APPROVE',
            changed_at: new Date().toISOString(),
        });

        setSheet((s) => ({ ...s, status: 'approved' }));
        push('Sheet approved!', 'success');
        setSaving(false);
    };

    // ─── SUPABASE: return sheet for rework + save comment ────────────────────────
    const handleReturnSheet = async () => {
        if (!comment.trim()) { push('Please add feedback before returning', 'error'); return; }
        setSaving(true);
        const { error } = await supabase
            .from('goal_sheets')
            .update({ status: 'draft' })
            .eq('id', sheet.id);
        if (error) { push('Return failed: ' + error.message, 'error'); setSaving(false); return; }

        // save the return comment as a checkin
        await supabase.from('checkins').insert({
            sheet_id: sheet.id,
            quarter: 'goal_setting',
            manager_id: profile.id,
            comment: comment,
        });

        // audit log
        await supabase.from('audit_logs').insert({
            entity_type: 'goal_sheets',
            entity_id: sheet.id,
            changed_by: profile.id,
            change_type: 'RETURN',
            new_value: { comment },
            changed_at: new Date().toISOString(),
        });

        setSheet((s) => ({ ...s, status: 'draft' }));
        setComment('');
        push('Sheet returned for rework', 'info');
        setSaving(false);
    };

    const isEditable = sheet?.status === 'submitted';

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-48" />
                <div className="h-64 bg-gray-100 rounded-xl" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Goal Review</h1>
                    <p className="text-slate-500 mt-1">Approve, return, or correct goal sheets inline.</p>
                </div>
                <select
                    value={empId || ''}
                    onChange={(e) => switchEmployee(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                    {reports.map((r) => (
                        <option key={r.id} value={r.id}>{r.full_name}</option>
                    ))}
                </select>
            </div>

            {!sheet ? (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-6 text-amber-800">
                    No goal sheet found for this employee.
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-3 mb-4">
                        <StatusBadge status={sheet.status} />
                        <span className="text-sm text-slate-500">{goals.length} goals</span>
                    </div>

                    {/* Goals table */}
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
                                        const a = achievements[g.id];
                                        const score = a ? computeScore(g, a) : null;
                                        const uom = g.uom_type || g.uom;
                                        return (
                                            <tr key={g.id} className={g.is_shared ? 'border-l-4 border-purple-400' : ''}>
                                                <td className="px-4 py-3 font-medium text-slate-900">
                                                    {g.is_shared && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded mr-1">
                                                            <Share2 className="w-3 h-3" /> Shared
                                                        </span>
                                                    )}
                                                    {g.title}
                                                    <div className="text-xs text-slate-500">{g.thrust_area}</div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">
                                                    {uom === 'timeline' ? g.target_date : g.target_value}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {uom === 'timeline' ? (
                                                        <input
                                                            type="date"
                                                            disabled={!isEditable}
                                                            value={g.target_date || ''}
                                                            onChange={(e) => handleInlineEdit(g.id, 'target_date', e.target.value)}
                                                            className="px-2 py-1 border border-gray-200 rounded disabled:bg-gray-50"
                                                        />
                                                    ) : (
                                                        <input
                                                            type="number"
                                                            disabled={!isEditable}
                                                            value={g.target_value ?? 0}
                                                            onChange={(e) => handleInlineEdit(g.id, 'target_value', Number(e.target.value))}
                                                            className="w-28 px-2 py-1 border border-gray-200 rounded disabled:bg-gray-50"
                                                        />
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">{g.weightage}%</td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        disabled={!isEditable}
                                                        value={g.weightage}
                                                        onChange={(e) => handleInlineEdit(g.id, 'weightage', Number(e.target.value))}
                                                        className="w-20 px-2 py-1 border border-gray-200 rounded disabled:bg-gray-50"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    {score !== null
                                                        ? <span className={`px-2 py-0.5 text-xs font-bold rounded ${scoreColor(score)}`}>{score.toFixed(0)}%</span>
                                                        : <span className="text-slate-400 text-xs">—</span>
                                                    }
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Action panel — only for submitted sheets */}
                    {isEditable && (
                        <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <label className="text-sm font-medium text-slate-700 mb-1 block">
                                Feedback comment (required when returning)
                            </label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Share feedback for the employee..."
                            />
                            <div className="mt-3 flex flex-wrap gap-2 justify-end">
                                <button
                                    onClick={handleReturnSheet}
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 font-medium text-sm"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                    Return for Rework
                                </button>
                                <button
                                    onClick={handleApproveSheet}
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium text-sm"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Approve Sheet
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}