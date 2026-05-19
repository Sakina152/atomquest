import { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import { supabase } from '../../lib/supabase';
import { Share2, Send, CheckCircle2, Loader2 } from 'lucide-react';

export default function SharedGoalPush({ profile }) {
    const [employees, setEmployees] = useState([]);
    const [sheets, setSheets] = useState({}); // keyed by employee_id
    const [goal, setGoal] = useState({
        title: '', thrust_area: '', uom_type: 'min',
        target_value: 0, weightage: 10,
    });
    const [selected, setSelected] = useState([]);
    const [pushed, setPushed] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { push } = useToast();

    // ─── SUPABASE: load all employees + their sheets ─────────────────────────────
    useEffect(() => {
        if (!profile?.id) return;
        loadEmployees();
    }, [profile]);

    const loadEmployees = async () => {
        setLoading(true);
        try {
            const { data: emps, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'employee');
            if (error) throw error;
            setEmployees(emps || []);

            if (emps?.length) {
                const { data: sheetData } = await supabase
                    .from('goal_sheets')
                    .select('*')
                    .in('employee_id', emps.map((e) => e.id))
                    .eq('cycle_year', 2026);
                const map = {};
                sheetData?.forEach((s) => { map[s.employee_id] = s; });
                setSheets(map);
            }
        } catch (err) {
            push('Failed to load employees: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggle = (id) =>
        setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

    // ─── SUPABASE: insert shared goals for each selected employee ────────────────
    const handlePushSharedGoal = async () => {
        if (!goal.title || selected.length === 0) return;
        setSaving(true);
        try {
            const insertedGoals = [];

            for (const empId of selected) {
                const sheet = sheets[empId];
                if (!sheet) {
                    push(`No goal sheet found for employee — skipping`, 'error');
                    continue;
                }

                // insert the shared goal into this employee's sheet
                const { data: newGoal, error } = await supabase
                    .from('goals')
                    .insert({
                        sheet_id: sheet.id,
                        title: goal.title,
                        thrust_area: goal.thrust_area,
                        uom_type: goal.uom_type,
                        target_value: goal.target_value,
                        weightage: goal.weightage,
                        is_shared: true,
                    })
                    .select()
                    .single();

                if (error) {
                    push(`Failed for ${empId}: ${error.message}`, 'error');
                    continue;
                }
                insertedGoals.push(newGoal);
            }

            // audit log
            await supabase.from('audit_logs').insert({
                entity_type: 'goals',
                entity_id: null,
                changed_by: profile.id,
                change_type: 'SHARED_PUSH',
                new_value: {
                    title: goal.title,
                    affected_employees: selected.length,
                },
                changed_at: new Date().toISOString(),
            });

            const pushedEmps = employees.filter((e) => selected.includes(e.id));
            setPushed({ goal, employees: pushedEmps });
            push(`Shared goal pushed to ${selected.length} employee${selected.length > 1 ? 's' : ''}!`, 'success');
            setSelected([]);
            setGoal({ title: '', thrust_area: '', uom_type: 'min', target_value: 0, weightage: 10 });

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
                    <div className="h-72 bg-gray-100 rounded-xl" />
                    <div className="h-72 bg-gray-100 rounded-xl" />
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
                <p className="text-slate-500 mt-1">Define a shared KPI and distribute to multiple employees.</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">

                {/* Goal definition form */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h2 className="font-semibold text-slate-900 mb-4">Goal Definition</h2>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs uppercase text-slate-500 font-semibold">Title</label>
                            <input
                                value={goal.title}
                                onChange={(e) => setGoal({ ...goal, title: e.target.value })}
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="e.g. Zero critical incidents"
                            />
                        </div>
                        <div>
                            <label className="text-xs uppercase text-slate-500 font-semibold">Thrust Area</label>
                            <input
                                value={goal.thrust_area}
                                onChange={(e) => setGoal({ ...goal, thrust_area: e.target.value })}
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="e.g. Reliability"
                            />
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
                                <input
                                    type="number"
                                    value={goal.target_value}
                                    onChange={(e) => setGoal({ ...goal, target_value: Number(e.target.value) })}
                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase text-slate-500 font-semibold">Weight %</label>
                                <input
                                    type="number"
                                    min={10}
                                    value={goal.weightage}
                                    onChange={(e) => setGoal({ ...goal, weightage: Number(e.target.value) })}
                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Employee selector */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h2 className="font-semibold text-slate-900 mb-4">
                        Select Employees ({selected.length})
                    </h2>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                        {employees.map((e) => {
                            const sheet = sheets[e.id];
                            const hasSheet = !!sheet;
                            const initials = e.full_name.split(' ').map((n) => n[0]).join('');
                            return (
                                <label
                                    key={e.id}
                                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${hasSheet ? 'hover:bg-slate-50' : 'opacity-50 cursor-not-allowed'}`}
                                >
                                    <input
                                        type="checkbox"
                                        disabled={!hasSheet}
                                        checked={selected.includes(e.id)}
                                        onChange={() => toggle(e.id)}
                                        className="w-4 h-4 accent-indigo-600"
                                    />
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold">
                                        {initials}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-slate-900">{e.full_name}</div>
                                        <div className="text-xs text-slate-500">
                                            {hasSheet ? `Sheet: ${sheet.status}` : 'No goal sheet'}
                                        </div>
                                    </div>
                                </label>
                            );
                        })}
                    </div>

                    <button
                        disabled={!goal.title || selected.length === 0 || saving}
                        onClick={handlePushSharedGoal}
                        className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-medium"
                    >
                        {saving
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Pushing...</>
                            : <><Send className="w-4 h-4" /> Push to selected employees</>
                        }
                    </button>
                </div>
            </div>

            {/* Success summary */}
            {pushed && (
                <div className="mt-6 bg-green-50 border border-green-300 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-green-700" />
                        <h3 className="font-semibold text-green-800">Goal pushed successfully</h3>
                    </div>
                    <p className="text-sm text-green-700 mb-2">
                        <strong>{pushed.goal.title}</strong> was pushed as a shared KPI to:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {pushed.employees.map((e) => (
                            <span key={e.id} className="px-2.5 py-1 text-xs font-medium bg-white border border-green-300 text-green-800 rounded-full">
                                {e.full_name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}