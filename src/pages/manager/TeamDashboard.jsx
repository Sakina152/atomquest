import { useState, useEffect } from 'react';
import { computeScore, weightedFinal } from '../../lib/scoring';
import StatusBadge from '../../components/StatusBadge';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';
import { ChevronRight } from 'lucide-react';

export default function TeamDashboard({ user, profile, onOpenReview }) {
    const [reports, setReports] = useState([]);
    const [sheets, setSheets] = useState({});   // keyed by employee_id
    const [goals, setGoals] = useState({});   // keyed by sheet_id
    const [achievements, setAchievements] = useState({}); // keyed by goal_id
    const [loading, setLoading] = useState(true);
    const { push } = useToast();

    // ─── SUPABASE: load all direct reports + their sheets + goals + achievements
    useEffect(() => {
        if (!profile?.id) return;
        loadTeamData();
    }, [profile]);

    const loadTeamData = async () => {
        setLoading(true);
        try {
            // 1. fetch direct reports
            const { data: reportData, error: repError } = await supabase
                .from('profiles')
                .select('*')
                .eq('manager_id', profile.id);
            if (repError) throw repError;
            setReports(reportData || []);

            if (!reportData?.length) return;

            const employeeIds = reportData.map((r) => r.id);

            // 2. fetch their goal sheets
            const { data: sheetData, error: sheetError } = await supabase
                .from('goal_sheets')
                .select('*')
                .in('employee_id', employeeIds)
                .eq('cycle_year', 2026);
            if (sheetError) throw sheetError;

            const sheetsMap = {};
            sheetData?.forEach((s) => { sheetsMap[s.employee_id] = s; });
            setSheets(sheetsMap);

            if (!sheetData?.length) return;

            const sheetIds = sheetData.map((s) => s.id);

            // 3. fetch all goals for those sheets
            const { data: goalsData, error: goalsError } = await supabase
                .from('goals')
                .select('*')
                .in('sheet_id', sheetIds);
            if (goalsError) throw goalsError;

            const goalsMap = {};
            goalsData?.forEach((g) => {
                if (!goalsMap[g.sheet_id]) goalsMap[g.sheet_id] = [];
                goalsMap[g.sheet_id].push(g);
            });
            setGoals(goalsMap);

            if (!goalsData?.length) return;

            // 4. fetch achievements for all those goals
            const goalIds = goalsData.map((g) => g.id);
            const { data: achData } = await supabase
                .from('achievements')
                .select('*')
                .in('goal_id', goalIds);

            const achMap = {};
            achData?.forEach((a) => { achMap[a.goal_id] = a; });
            setAchievements(achMap);

        } catch (err) {
            push('Failed to load team data: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-48" />
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-48 bg-gray-100 rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Team Dashboard</h1>
                <p className="text-slate-500 mt-1">{reports.length} direct reports</p>
            </div>

            {reports.length === 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-6 text-amber-800">
                    No direct reports found. Make sure employees have their manager_id set correctly in the database.
                </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports.map((r) => {
                    const sheet = sheets[r.id];
                    const sheetGoals = sheet ? (goals[sheet.id] || []) : [];
                    const final = sheetGoals.length ? weightedFinal(sheetGoals, achievements) : 0;
                    const initials = r.full_name.split(' ').map((n) => n[0]).join('');
                    return (
                        <button
                            key={r.id}
                            onClick={() => onOpenReview && onOpenReview(r.id)}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-200 transition-all p-5 text-left"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm">
                                    {initials}
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold text-slate-900">{r.full_name}</div>
                                    <div className="text-xs text-slate-500 capitalize">{r.role}</div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-400" />
                            </div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs uppercase text-slate-500 font-semibold">Sheet Status</span>
                                {sheet
                                    ? <StatusBadge status={sheet.status} />
                                    : <span className="text-xs text-slate-400">No sheet</span>
                                }
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs uppercase text-slate-500 font-semibold">Goals</span>
                                <span className="text-sm font-medium text-slate-900">{sheetGoals.length}</span>
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-100">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs uppercase text-slate-500 font-semibold">YTD Score</span>
                                    <span className="text-sm font-bold text-indigo-600">{final.toFixed(0)}%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                                        style={{ width: `${final}%` }}
                                    />
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}