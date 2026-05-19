import { useState, useEffect, useMemo } from 'react';
import { computeScore, scoreColor } from '../../lib/scoring';
import { useToast } from '../../components/Toast';
import { supabase } from '../../lib/supabase';
import { Save, Loader2 } from 'lucide-react';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function CheckIn({ user, profile }) {
    const [reports, setReports] = useState([]);
    const [empId, setEmpId] = useState(null);
    const [quarter, setQuarter] = useState('Q1');
    const [sheet, setSheet] = useState(null);
    const [goals, setGoals] = useState([]);
    const [achievements, setAchievements] = useState({});
    const [comments, setComments] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { push } = useToast();

    // ─── SUPABASE: load direct reports ──────────────────────────────────────────
    useEffect(() => {
        if (!profile?.id) return;
        supabase
            .from('profiles')
            .select('*')
            .eq('manager_id', profile.id)
            .then(({ data }) => {
                setReports(data || []);
                if (data?.[0]) {
                    setEmpId(data[0].id);
                    loadEmployeeData(data[0].id);
                } else {
                    setLoading(false);
                }
            });
    }, [profile]);

    // ─── SUPABASE: load sheet + goals + achievements for selected employee ───────
    const loadEmployeeData = async (employeeId) => {
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
                achData?.forEach((a) => { map[`${a.goal_id}_${a.quarter}`] = a; });
                setAchievements(map);
            }

            // load existing checkin comments for this sheet
            const { data: checkinData } = await supabase
                .from('checkins')
                .select('*')
                .eq('sheet_id', sheetData.id);
            const commentMap = {};
            checkinData?.forEach((c) => { commentMap[`${sheetData.id}_${c.quarter}`] = c.comment; });
            setComments(commentMap);

        } catch (err) {
            push('Failed to load: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const switchEmployee = (id) => {
        setEmpId(id);
        loadEmployeeData(id);
    };

    // ─── SUPABASE: upsert into checkins ─────────────────────────────────────────
    const handleSaveComment = async () => {
        if (!sheet) return;
        const key = `${sheet.id}_${quarter}`;
        const comment = comments[key] || '';
        setSaving(true);
        try {
            const { error } = await supabase
                .from('checkins')
                .upsert({
                    sheet_id: sheet.id,
                    quarter,
                    manager_id: profile.id,
                    comment,
                }, { onConflict: 'sheet_id,quarter' });
            if (error) throw error;

            // audit log
            await supabase.from('audit_logs').insert({
                entity_type: 'checkins',
                entity_id: sheet.id,
                changed_by: profile.id,
                change_type: 'CHECKIN',
                new_value: { quarter, comment },
                changed_at: new Date().toISOString(),
            });

            push(`${quarter} check-in saved!`, 'success');
        } catch (err) {
            push('Save failed: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const key = sheet ? `${sheet.id}_${quarter}` : '';

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
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Quarterly Check-In</h1>
                <p className="text-slate-500 mt-1">Sync performance with your team.</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
                <select
                    value={empId || ''}
                    onChange={(e) => switchEmployee(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                    {reports.map((r) => (
                        <option key={r.id} value={r.id}>{r.full_name}</option>
                    ))}
                </select>
                <select
                    value={quarter}
                    onChange={(e) => setQuarter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                    {QUARTERS.map((q) => <option key={q}>{q}</option>)}
                </select>
            </div>

            {/* Performance table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4">
                <div className="overflow-x-auto max-h-[45vh] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0">
                            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                                <th className="px-4 py-3">Goal</th>
                                <th className="px-4 py-3">Target</th>
                                <th className="px-4 py-3">Actual ({quarter})</th>
                                <th className="px-4 py-3">Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {goals.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                                        No goals found for this employee.
                                    </td>
                                </tr>
                            )}
                            {goals.map((g) => {
                                const a = achievements[`${g.id}_${quarter}`];
                                const score = a ? computeScore(g, a) : 0;
                                const uom = g.uom_type || g.uom;
                                return (
                                    <tr key={g.id}>
                                        <td className="px-4 py-3 font-medium text-slate-900">
                                            {g.title}
                                            <div className="text-xs text-slate-500">{g.thrust_area}</div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">
                                            {uom === 'timeline' ? g.target_date : g.target_value}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">
                                            {a?.actual_value ?? '—'}
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

            {/* Comment box */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                    {quarter} discussion notes
                </label>
                <textarea
                    rows={4}
                    value={comments[key] || ''}
                    onChange={(e) => setComments((c) => ({ ...c, [key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="What went well? What's blocked?"
                />
                <div className="mt-3 flex justify-end">
                    <button
                        onClick={handleSaveComment}
                        disabled={saving || !sheet}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-gray-300 text-white font-medium text-sm"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Check-In
                    </button>
                </div>
            </div>
        </div>
    );
}