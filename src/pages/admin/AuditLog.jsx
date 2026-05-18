import { AUDIT_LOGS } from '../../lib/mockData';
import { Lock, Unlock, CheckCircle2, Edit3, Share2 } from 'lucide-react';

const ICONS = { LOCK: Lock, UNLOCK: Unlock, APPROVE: CheckCircle2, UPDATE: Edit3, SHARED_PUSH: Share2 };
const COLORS = { LOCK: 'bg-blue-100 text-blue-700', UNLOCK: 'bg-amber-100 text-amber-700', APPROVE: 'bg-green-100 text-green-700', UPDATE: 'bg-indigo-100 text-indigo-700', SHARED_PUSH: 'bg-purple-100 text-purple-700' };

export default function AuditLog() {
    const logs = [...AUDIT_LOGS].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Audit Log</h1>
                <p className="text-slate-500 mt-1">Immutable trail of admin actions.</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <ol className="relative border-l-2 border-gray-200 ml-3 space-y-6">
                    {logs.map((l) => {
                        const Icon = ICONS[l.action] || Edit3;
                        const color = COLORS[l.action] || 'bg-gray-100 text-gray-700';
                        return (
                            <li key={l.id} className="ml-6">
                                <span className={`absolute -left-4 w-8 h-8 rounded-full ${color} flex items-center justify-center border-4 border-white`}>
                                    <Icon className="w-4 h-4" />
                                </span>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold text-slate-900">{l.actor}</span>
                                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${color}`}>{l.action}</span>
                                    <span className="text-xs text-slate-500">on {l.entity}</span>
                                </div>
                                <p className="text-sm text-slate-600 mt-1">{l.details}</p>
                                {l.old && l.new && <p className="text-xs text-slate-500 mt-1">Changed from <code className="bg-gray-100 px-1 rounded">{JSON.stringify(l.old)}</code> to <code className="bg-gray-100 px-1 rounded">{JSON.stringify(l.new)}</code></p>}
                                {l.affected_employees && <p className="text-xs text-slate-500 mt-1">Affected {l.affected_employees} employees</p>}
                                <time className="text-xs text-slate-400 mt-1 block">{l.timestamp}</time>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </div>
    );
}
