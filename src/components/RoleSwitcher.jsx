import { useState } from 'react';
import { Users, ChevronUp } from 'lucide-react';
import { USERS } from '../lib/mockData';

export default function RoleSwitcher({ onSwitch, currentId }) {
    const [open, setOpen] = useState(false);
    const options = [
        USERS.find((u) => u.id === 'u1'),
        USERS.find((u) => u.id === 'u4'),
        USERS.find((u) => u.id === 'u5'),
    ];
    return (
        <div className="fixed bottom-6 right-6 z-50">
            {open && (
                <div className="mb-2 bg-white rounded-xl shadow-2xl border border-gray-200 w-64 overflow-hidden">
                    <div className="px-3 py-2 text-xs font-semibold uppercase text-gray-500 border-b">Switch role</div>
                    {options.map((u) => (
                        <button
                            key={u.id}
                            onClick={() => { onSwitch(u.id); setOpen(false); }}
                            className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 ${currentId === u.id ? 'bg-slate-100' : ''}`}
                        >
                            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                                {u.name.split(' ').map((n) => n[0]).join('')}
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-medium text-slate-900">{u.name}</div>
                                <div className="text-xs text-slate-500 capitalize">{u.role}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
            <button
                onClick={() => setOpen((o) => !o)}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-xl px-4 py-3 flex items-center gap-2 font-medium"
            >
                <Users className="w-4 h-4" /> Switch Role <ChevronUp className={`w-4 h-4 transition-transform ${open ? '' : 'rotate-180'}`} />
            </button>
        </div>
    );
}
