import { useState } from 'react';
import { computeScore, weightedFinal } from '../../lib/scoring';
import { useToast } from '../../components/Toast';
import { supabase } from '../../lib/supabase';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';

export default function ExportReport({ profile }) {
    const [loading, setLoading] = useState(false);
    const { push } = useToast();

    // ─── SUPABASE: fetch all data then convert to CSV ────────────────────────────
    const handleExportCSV = async () => {
        setLoading(true);
        try {
            // fetch all employees
            const { data: employees } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'employee');

            // fetch all sheets
            const { data: sheets } = await supabase
                .from('goal_sheets')
                .select('*')
                .eq('cycle_year', 2026);

            const sheetMap = {};
            sheets?.forEach((s) => { sheetMap[s.employee_id] = s; });

            // fetch all goals
            const { data: goals } = await supabase
                .from('goals')
                .select('*')
                .in('sheet_id', sheets?.map((s) => s.id) || []);

            const goalsBySheet = {};
            goals?.forEach((g) => {
                if (!goalsBySheet[g.sheet_id]) goalsBySheet[g.sheet_id] = [];
                goalsBySheet[g.sheet_id].push(g);
            });

            // fetch all achievements
            const { data: achievements } = await supabase
                .from('achievements')
                .select('*')
                .in('goal_id', goals?.map((g) => g.id) || []);

            const achMap = {};
            achievements?.forEach((a) => {
                achMap[`${a.goal_id}_${a.quarter}`] = a;
            });

            const achById = {};
            achievements?.forEach((a) => { achById[a.goal_id] = a; });

            // build CSV rows
            const headers = [
                'Employee Name', 'Thrust Area', 'Goal Title', 'UoM Type', 'Target Value',
                'Q1 Actual', 'Q1 Score%',
                'Q2 Actual', 'Q2 Score%',
                'Q3 Actual', 'Q3 Score%',
                'Q4 Actual', 'Q4 Score%',
                'Final Weighted Score%', 'Sheet Status',
            ];
            const rows = [headers];

            employees?.forEach((emp) => {
                const sheet = sheetMap[emp.id];
                if (!sheet) return;
                const sheetGoals = goalsBySheet[sheet.id] || [];
                const final = sheetGoals.length ? weightedFinal(sheetGoals, achById).toFixed(1) : '0';

                sheetGoals.forEach((g) => {
                    const uom = g.uom_type || g.uom;
                    const row = [
                        emp.full_name,
                        g.thrust_area,
                        g.title,
                        uom,
                        uom === 'timeline' ? g.target_date : g.target_value,
                    ];
                    ['Q1', 'Q2', 'Q3', 'Q4'].forEach((q) => {
                        const a = achMap[`${g.id}_${q}`];
                        row.push(a?.actual_value ?? '');
                        row.push(a ? computeScore(g, a).toFixed(1) : '');
                    });
                    row.push(final);
                    row.push(sheet.status);
                    rows.push(row);
                });
            });

            // trigger download
            const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `atomquest_performance_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            push('CSV exported successfully!', 'success');
        } catch (err) {
            push('Export failed: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
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
                <p className="text-sm text-slate-500 mb-6">
                    Includes every employee, every goal, every quarter — with scores and final weighted totals.
                </p>
                <button
                    onClick={handleExportCSV}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-gray-300 text-white font-medium"
                >
                    {loading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                        : <><Download className="w-4 h-4" /> Download CSV</>
                    }
                </button>
            </div>
        </div>
    );
}