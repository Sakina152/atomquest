import { useMemo, useState } from 'react';
import { USERS, GOAL_SHEETS, GOALS, ACHIEVEMENTS } from '../../lib/mockData';
import { computeScore, scoreColor } from '../../lib/scoring';
import { useToast } from '../../components/Toast';
import { Save } from 'lucide-react';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function CheckIn({ user }) {
    const reports = USERS.filter((u) => u.manager === user.id);
    const [empId, setEmpId] = useState(reports[0]?.id);
    const [quarter, setQuarter] = useState('Q1');
    const [comments, setComments] = useState({});
    const { push } = useToast();

    const sheet = GOAL_SHEETS.find((s) => s.employee_id === empId);
    const goals = sheet ? GOALS.filter((g) => g.sheet_id === sheet.id) : [];
    const achById = useMemo(() => { const m = {}; ACHIEVEMENTS.forEach((a) => { m[a.goal_id] = a; }); return m; }, []);

    // SUPABASE: upsert into checkins
    const handleSaveComment = async (sheetId, q, comment) => {
        setComments((c) => ({ ...c, [`${sheetId}_${q}`]: comment }));
        push('Check-in comment saved');
    };
    const key = sheet ? `${sheet.id}_${quarter}` : '';

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Quarterly Check-In</h1>
                <p className="text-slate-500 mt-1">Sync performance with your team.</p>
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
                <select value={empId} onChange={(e) => setEmpId(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg">
                    {reports.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <select value={quarter} onChange={(e) => setQuarter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg">
                    {QUARTERS.map((q) => <option key={q}>{q}</option>)}
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4">
                <div className="overflow-x-auto max-h-[45vh] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0">
                            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                                <th className="px-4 py-3">Goal</th>
                                <th className="px-4 py-3">Target</th>
                                <th className="px-4 py-3">Actual</th>
                                <th className="px-4 py-3">Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {goals.map((g) => {
                                const a = achById[g.id];
                                const s = a ? computeScore(g, a) : 0;
                                return (
                                    <tr key={g.id}>
                                        <td className="px-4 py-3 font-medium text-slate-900">{g.title}</td>
                                        <td className="px-4 py-3 text-slate-700">{g.uom === 'timeline' ? g.target_date : g.target}</td>
                                        <td className="px-4 py-3 text-slate-700">{a?.actual ?? '—'}</td>
                                        <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs font-bold rounded ${scoreColor(s)}`}>{s.toFixed(0)}%</span></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <label className="text-sm font-medium text-slate-700 mb-1 block">{quarter} discussion notes</label>
                <textarea rows={4} value={comments[key] || ''} onChange={(e) => setComments((c) => ({ ...c, [key]: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="What went well? What's blocked?" />
                <div className="mt-3 flex justify-end">
                    <button onClick={() => handleSaveComment(sheet?.id, quarter, comments[key] || '')} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm"><Save className="w-4 h-4" /> Save Check-In</button>
                </div>
            </div>
        </div>
    );
}
