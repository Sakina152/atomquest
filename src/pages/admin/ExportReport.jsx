import { USERS, GOAL_SHEETS, GOALS, ACHIEVEMENTS } from '../../lib/mockData';
import { computeScore, weightedFinal } from '../../lib/scoring';
import { useToast } from '../../components/Toast';
import { Download, FileSpreadsheet } from 'lucide-react';

export default function ExportReport() {
    const { push } = useToast();
    // SUPABASE: query achievements JOIN goals JOIN profiles, convert to CSV
    const handleExportCSV = async () => {
        const headers = ['Employee Name', 'Thrust Area', 'Goal Title', 'UoM Type', 'Target Value', 'Q1 Actual', 'Q1 Score%', 'Q2 Actual', 'Q2 Score%', 'Q3 Actual', 'Q3 Score%', 'Q4 Actual', 'Q4 Score%', 'Final Weighted Score%', 'Sheet Status'];
        const rows = [headers];

        const achByGoalQ = {};
        ACHIEVEMENTS.forEach((a) => { achByGoalQ[`${a.goal_id}_${a.quarter}`] = a; });

        USERS.filter((u) => u.role === 'employee').forEach((emp) => {
            const sheet = GOAL_SHEETS.find((s) => s.employee_id === emp.id);
            if (!sheet) return;
            const goals = GOALS.filter((g) => g.sheet_id === sheet.id);
            const achById = {}; ACHIEVEMENTS.forEach((a) => { achById[a.goal_id] = a; });
            const final = weightedFinal(goals, achById).toFixed(1);
            goals.forEach((g) => {
                const row = [emp.name, g.thrust, g.title, g.uom, g.uom === 'timeline' ? g.target_date : g.target];
                ['Q1', 'Q2', 'Q3', 'Q4'].forEach((q) => {
                    const a = achByGoalQ[`${g.id}_${q}`];
                    row.push(a?.actual ?? '');
                    row.push(a ? computeScore(g, a).toFixed(1) : '');
                });
                row.push(final);
                row.push(sheet.status);
                rows.push(row);
            });
        });

        const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `atomquest_performance_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        push('CSV export triggered');
    };

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Export Report</h1>
                <p className="text-slate-500 mt-1">Download org-wide performance data as CSV.</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 items-center justify-center mb-4">
                    <FileSpreadsheet className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Full Performance Export</h2>
                <p className="text-sm text-slate-500 mb-6">Includes every employee, every goal, every quarter — with scores and final weighted totals.</p>
                <button onClick={handleExportCSV} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium">
                    <Download className="w-4 h-4" /> Download CSV
                </button>
            </div>
        </div>
    );
}
