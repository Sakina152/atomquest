import { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import { supabase } from '../../lib/supabase';
import { Share2, Send, CheckCircle2, Loader2 } from 'lucide-react';

const THRUST_OPTIONS = [
    'Revenue Growth', 'Retention', 'Product Delivery',
    'Reliability', 'People', 'Governance', 'Customer Success', 'Innovation',
];

export default function SharedGoalPush({ profile }) {
    const [employees, setEmployees] = useState([]);
    const [goal, setGoal] = useState({
        title: '',
        thrust_area: 'Revenue Growth',
        uom_type: 'min',
        target_value: 0,
        weightage: 10,
        is_shared: true,
    });
    const [selected, setSelected] = useState([]);
    const [pushed, setPushed] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { push } = useToast();

    // ─── SUPABASE: load all employee profiles ───────────────────────────────────
    useEffect(() => {
        if (!profile?.id) return;
        supabase
            .from('profiles')
            .select('*')
            .eq('role', 'employee')
            .then(({ data, error }) => {
                if (error) push('Failed to load employees: ' + error.message, 'error');
                setEmployees(data || []);
                setLoading(false);
            });
    }, [profile]);

    const toggle = (id) =>
        setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

    const selectAll = () =>
        setSelected(employees.map((e) => e.id));

    const clearAll = () => setSelected([]);

    // ─── SUPABASE: for each selected employee, find/create their sheet then insert goal ──
    const handlePushSharedGoal = async () => {
        if (!goal.title.trim()) { push('Please enter a goal title', 'error'); return; }
        if (selected.length === 0) { push('Select at least one employee', 'error'); return; }

        setSaving(true);
        try {
            const results = [];
            const failed = [];

            for (const empId of selected) {
                // 1. find or create a draft sheet for this employee
                let { data: sheets } = await supabase
                    .from('goal_sheets')
                    .select('id, status')
                    .eq('employee_id', empId)
                    .eq('cycle_year', 2026);

                let sheetId = sheets?.[0]?.id;
                if (!sheetId) {
                    const { data: newSheet, error: sheetErr } = await supabase
                        .from('goal_sheets')
                        .insert({ employee_id: empId, cycle_year: 2026, status: 'draft' })
                        .select('id')
                        .single();
                    if (sheetErr) { failed.push(empId); continue; }
                    sheetId = newSheet.id;
                }

                // 2. insert the shared goal into that sheet
                const { error: goalErr } = await supabase
                    .from('goals')
                    .insert({
                        sheet_id: sheetId,
                        title: goal.title,
                        thrust_area: goal.thrust_area,
                        uom_type: goal.uom_type,
                        target_value: goal.target_value,
                        weightage: goal.weightage,
                        is_shared: true,
                    });

                if (goalErr) { failed.push(empId); continue; }
                results.push(empId);
            }

            // 3. audit log
            if (results.length > 0) {
                await supabase.from('audit_logs').insert({
                    entity_type: 'goals',
                    entity_id: null,
                    changed_by: profile.id,
                    change_type: 'SHARED_PUSH',
                    new_value: {
                        goal_title: goal.title,
                        thrust_area: goal.thrust_area,
                        pushed_to: results.length,
                    },
                    changed_at: new Date().toISOString(),
                });
            }

            const pushedEmployees = employees.filter((e) => results.includes(e.id));
            setPushed({ goal, employees: pushedEmployees });
            setSelected([]);
            setGoal({ title: '', thrust_area: 'Revenue Growth', uom_type: 'min', target_value: 0, weightage: 10, is_shared: true });

            if (failed.length > 0) {
                push(`Pushed to ${results.length} employees. ${failed.length} failed.`, 'info');
            } else {
                push(`Shared goal pushed to ${results.length} employee${results.length > 1 ? 's' : ''}!`, 'success');
            }
        } catch (err) {
            push('Push failed: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 max-w-5xl mx-auto animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-64" />
                <div className="grid lg:grid-cols-2 gap-4">
                    <div className="h-64 bg-gray-100 rounded-xl" />
                    <div className="h-64 bg-gray-100 rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
                    <Share2 className="w-7 h-7 text-purple-600" /> Shared Goal Push
                </h1>
                <p className="text-slate-500 mt-1">Define a shared KPI and distribute it to multiple employees' goal sheets.</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
                {/* ── Goal Definition ── */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h2 className="font-semibold text-slate-900 mb-4">Goal Definition</h2>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs uppercase text-slate-500 font-semibold">Title *</label>
                            <input
                                value={goal.title}
                                onChange={(e) => setGoal({ ...goal, title: e.target.value })}
                                placeholder="e.g. Zero critical incidents"
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs uppercase text-slate-500 font-semibold">Thrust Area</label>
                            <select
                                value={goal.thrust_area}
                                onChange={(e) => setGoal({ ...goal, thrust_area: e.target.value })}
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                {THRUST_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="text-xs uppercase text-slate-500 font-semibold">UoM</label>
                                <select
                                    value={goal.uom_type}
                                    onChange={(e) => setGoal({ ...goal, uom_type: e.target.value })}
                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                                >
                                    <option value="min">min</option>
                                    <option value="max">max</option>
                                    <option value="zero">zero</option>
                                    <option value="timeline">timeline</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs uppercase text-slate-500 font-semibold">Target</label>
                                {goal.uom_type === 'timeline' ? (
                                    <input
                                        type="date"
                                        value={goal.target_date || ''}
                                        onChange={(e) => setGoal({ ...goal, target_date: e.target.value })}
                                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                ) : (
                                    <input
                                        type="number"
                                        value={goal.target_value}
                                        onChange={(e) => setGoal({ ...goal, target_value: Number(e.target.value) })}
                                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                )}
                            </div>
                            <div>
                                <label className="text-xs uppercase text-slate-500 font-semibold">Weight %</label>
                                <input
                                    type="number"
                                    min={10}
                                    max={100}
                                    value={goal.weightage}
                                    onChange={(e) => setGoal({ ...goal, weightage: Number(e.target.value) })}
                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                        </div>

                        {/* Preview card */}
                        <div className="mt-2 bg-purple-50 border border-purple-200 rounded-lg p-3">
                            <p className="text-xs font-semibold text-purple-700 uppercase mb-1">Preview</p>
                            <p className="text-sm font-medium text-slate-900">{goal.title || '(untitled)'}</p>
                            <p className="text-xs text-slate-500">{goal.thrust_area} · {goal.uom_type} · {goal.weightage}%</p>
                        </div>
                    </div>
                </div>

                {/* ── Employee Selector ── */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-slate-900">
                            Select Employees ({selected.length}/{employees.length})
                        </h2>
                        <div className="flex gap-2 text-xs">
                            <button onClick={selectAll} className="text-indigo-600 hover:underline font-medium">All</button>
                            <span className="text-gray-300">|</span>
                            <button onClick={clearAll} className="text-slate-500 hover:underline">Clear</button>
                        </div>
                    </div>

                    <div className="space-y-2 max-h-72 overflow-y-auto">
                        {employees.length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-8">No employees found in the database.</p>
                        )}
                        {employees.map((e) => (
                            <label key={e.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selected.includes(e.id)}
                                    onChange={() => toggle(e.id)}
                                    className="w-4 h-4 accent-indigo-600"
                                />
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                    {e.full_name.split(' ').map((n) => n[0]).join('')}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-slate-900 truncate">{e.full_name}</div>
                                    <div className="text-xs text-slate-500 truncate">{e.email}</div>
                                </div>
                            </label>
                        ))}
                    </div>

                    <button
                        disabled={!goal.title.trim() || selected.length === 0 || saving}
                        onClick={handlePushSharedGoal}
                        className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium transition-colors"
                    >
                        {saving
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Pushing...</>
                            : <><Send className="w-4 h-4" /> Push to {selected.length || 'selected'} employee{selected.length !== 1 ? 's' : ''}</>
                        }
                    </button>
                </div>
            </div>

            {/* Success confirmation */}
            {pushed && (
                <div className="mt-6 bg-green-50 border border-green-300 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-green-700" />
                        <h3 className="font-semibold text-green-800">Goal pushed successfully</h3>
                    </div>
                    <p className="text-sm text-green-700 mb-3">
                        <strong>{pushed.goal.title}</strong> was added as a shared KPI to:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {pushed.employees.map((e) => (
                            <span key={e.id} className="px-2.5 py-1 text-xs font-medium bg-white border border-green-300 text-green-800 rounded-full">
                                {e.full_name}
                            </span>
                        ))}
                    </div>
                    <button
                        onClick={() => setPushed(null)}
                        className="mt-3 text-xs text-green-600 hover:underline"
                    >
                        Dismiss
                    </button>
                </div>
            )}
        </div>
    );
}
