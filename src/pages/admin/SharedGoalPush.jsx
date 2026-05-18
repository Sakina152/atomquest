import { useState } from 'react';
import { USERS } from '../../lib/mockData';
import { useToast } from '../../components/Toast';
import { Share2, Send, CheckCircle2 } from 'lucide-react';

export default function SharedGoalPush() {
    const employees = USERS.filter((u) => u.role === 'employee');
    const [goal, setGoal] = useState({ title: '', thrust: '', uom: 'min', target: 0, weightage: 10, is_shared: true });
    const [selected, setSelected] = useState([]);
    const [pushed, setPushed] = useState(null);
    const { push } = useToast();

    const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

    // SUPABASE: insert shared goals for each employee
    const handlePushSharedGoal = async (goalTemplate, employeeIds) => {
        setPushed({ goal: goalTemplate, employees: employeeIds.map((id) => employees.find((e) => e.id === id)) });
        push(`Shared goal pushed to ${employeeIds.length} employees`);
        setSelected([]);
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2"><Share2 className="w-7 h-7 text-purple-600" /> Shared Goal Push</h1>
                <p className="text-slate-500 mt-1">Define a shared KPI and distribute to multiple employees.</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h2 className="font-semibold text-slate-900 mb-4">Goal Definition</h2>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs uppercase text-slate-500 font-semibold">Title</label>
                            <input value={goal.title} onChange={(e) => setGoal({ ...goal, title: e.target.value })} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                            <label className="text-xs uppercase text-slate-500 font-semibold">Thrust Area</label>
                            <input value={goal.thrust} onChange={(e) => setGoal({ ...goal, thrust: e.target.value })} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="text-xs uppercase text-slate-500 font-semibold">UoM</label>
                                <select value={goal.uom} onChange={(e) => setGoal({ ...goal, uom: e.target.value })} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg">
                                    <option value="min">min</option><option value="max">max</option><option value="zero">zero</option><option value="timeline">timeline</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs uppercase text-slate-500 font-semibold">Target</label>
                                <input type="number" value={goal.target} onChange={(e) => setGoal({ ...goal, target: Number(e.target.value) })} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="text-xs uppercase text-slate-500 font-semibold">Weight %</label>
                                <input type="number" value={goal.weightage} onChange={(e) => setGoal({ ...goal, weightage: Number(e.target.value) })} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h2 className="font-semibold text-slate-900 mb-4">Select Employees ({selected.length})</h2>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                        {employees.map((e) => (
                            <label key={e.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                                <input type="checkbox" checked={selected.includes(e.id)} onChange={() => toggle(e.id)} className="w-4 h-4 accent-indigo-600" />
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold">{e.name.split(' ').map((n) => n[0]).join('')}</div>
                                <div className="flex-1"><div className="text-sm font-medium text-slate-900">{e.name}</div><div className="text-xs text-slate-500">{e.email}</div></div>
                            </label>
                        ))}
                    </div>
                    <button disabled={!goal.title || selected.length === 0} onClick={() => handlePushSharedGoal(goal, selected)} className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-medium">
                        <Send className="w-4 h-4" /> Push to selected employees
                    </button>
                </div>
            </div>

            {pushed && (
                <div className="mt-6 bg-green-50 border border-green-300 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="w-5 h-5 text-green-700" /><h3 className="font-semibold text-green-800">Goal pushed successfully</h3></div>
                    <p className="text-sm text-green-700 mb-2"><strong>{pushed.goal.title}</strong> was pushed as a shared KPI to:</p>
                    <div className="flex flex-wrap gap-2">{pushed.employees.map((e) => <span key={e.id} className="px-2.5 py-1 text-xs font-medium bg-white border border-green-300 text-green-800 rounded-full">{e.name}</span>)}</div>
                </div>
            )}
        </div>
    );
}
