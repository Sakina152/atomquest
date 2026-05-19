import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';
import { Lock, Unlock, CheckCircle2, Edit3, Share2, MessageSquare } from 'lucide-react';

const ICONS = { LOCK: Lock, UNLOCK: Unlock, APPROVE: CheckCircle2, UPDATE: Edit3, SHARED_PUSH: Share2, CHECKIN: MessageSquare, RETURN: Edit3 };
const COLORS = { LOCK: 'bg-blue-100 text-blue-700', UNLOCK: 'bg-amber-100 text-amber-700', APPROVE: 'bg-green-100 text-green-700', UPDATE: 'bg-indigo-100 text-indigo-700', SHARED_PUSH: 'bg-purple-100 text-purple-700', CHECKIN: 'bg-teal-100 text-teal-700', RETURN: 'bg-red-100 text-red-700' };

export default function AuditLog({ profile }) {
    const [logs, setLogs] = useState([]);
    const [profiles, setProfiles] = useState({});
    const [loading, setLoading] = useState(true);
    const { push } = useToast();

    // ─── SUPABASE: fetch audit logs + actor profiles ─────────────────────────────
    useEffect(() => {
        if (!profile?.id) return;
        loadLogs();
    }, [profile]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const { data: logsData, error } = await supabase
                .from('audit_logs')
                .select('*')
                .order('changed_at', { ascending: false });
            if (error) throw error;
            setLogs(logsData || []);

            // fetch all actor profiles for display names
            const actorIds = [...new Set(logsData?.map((l) => l.changed_by).filter(Boolean))];
            if (actorIds.length) {
                const { data: profilesData } = await supabase
                    .from('profiles')
                    .select('id, full_name')
                    .in('id', actorIds);
                const map = {};
                profilesData?.forEach((p) => { map[p.id] = p.full_name; });
                setProfiles(map);
            }
        } catch (err) {
            push('Failed to load audit log: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 max-w-4xl mx-auto animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-48" />
                {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Audit Log</h1>
                <p className="text-slate-500 mt-1">Immutable trail of all admin and manager actions.</p>
            </div>

            {logs.length === 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-6 text-amber-800">
                    No audit log entries yet.
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <ol className="relative border-l-2 border-gray-200 ml-3 space-y-6">
                    {logs.map((l) => {
                        const Icon = ICONS[l.change_type] || Edit3;
                        const color = COLORS[l.change_type] || 'bg-gray-100 text-gray-700';
                        const actor = profiles[l.changed_by] || l.changed_by?.slice(0, 8) + '...';
                        return (
                            <li key={l.id} className="ml-6">
                                <span className={`absolute -left-4 w-8 h-8 rounded-full ${color} flex items-center justify-center border-4 border-white`}>
                                    <Icon className="w-4 h-4" />
                                </span>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold text-slate-900">{actor}</span>
                                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${color}`}>
                                        {l.change_type}
                                    </span>
                                    <span className="text-xs text-slate-500">on {l.entity_type}</span>
                                </div>
                                {l.old_value && l.new_value && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        Changed from{' '}
                                        <code className="bg-gray-100 px-1 rounded">{JSON.stringify(l.old_value)}</code>
                                        {' '}to{' '}
                                        <code className="bg-gray-100 px-1 rounded">{JSON.stringify(l.new_value)}</code>
                                    </p>
                                )}
                                <time className="text-xs text-slate-400 mt-1 block">
                                    {new Date(l.changed_at).toLocaleString()}
                                </time>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </div>
    );
}