import { useState } from 'react';
import { Users, ChevronUp, Loader2 } from 'lucide-react';
import { USERS } from '../lib/mockData';
import { supabase } from '../lib/supabase';

const ROLE_MAP = [
    { id: 'u1', email: 'charlie@atomquest.com' },
    { id: 'u4', email: 'bob@atomquest.com' },
    { id: 'u5', email: 'alice@atomquest.com' },
];

const DEMO_PASSWORD = 'Test@1234';

export default function RoleSwitcher({ onSwitch, currentId }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(null);

    const options = ROLE_MAP.map((r) => ({
        ...r,
        user: USERS.find((u) => u.id === r.id),
    }));

    // SUPABASE: signs in as the selected demo user and passes profile up
    const handleSwitch = async (option) => {
        if (option.id === currentId) { setOpen(false); return; }
        setLoading(option.id);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: option.email,
                password: DEMO_PASSWORD,
            });
            if (error) throw error;

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            onSwitch({ supabaseUser: data.user, profile, mockId: option.id });
        } catch (err) {
            console.error('Role switch failed:', err.message);
        } finally {
            setLoading(null);
            setOpen(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {open && (
                <div className="mb-2 bg-white rounded-xl shadow-2xl border border-gray-200 w-64 overflow-hidden">
                    <div className="px-3 py-2 text-xs font-semibold uppercase text-gray-500 border-b">
                        Switch role
                    </div>
                    {options.map((o) => (
                        <button
                            key={o.id}
                            onClick={() => handleSwitch(o)}
                            disabled={!!loading}
                            className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 disabled:opacity-60 ${currentId === o.id ? 'bg-slate-100' : ''}`}
                        >
                            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                                {loading === o.id
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : o.user.name.split(' ').map((n) => n[0]).join('')
                                }
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-medium text-slate-900">{o.user.name}</div>
                                <div className="text-xs text-slate-500 capitalize">{o.user.role}</div>
                            </div>
                            {currentId === o.id && (
                                <span className="text-xs text-indigo-600 font-medium">Active</span>
                            )}
                        </button>
                    ))}
                </div>
            )}
            <button
                onClick={() => setOpen((o) => !o)}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-xl px-4 py-3 flex items-center gap-2 font-medium"
            >
                <Users className="w-4 h-4" /> Switch Role
                <ChevronUp className={`w-4 h-4 transition-transform ${open ? '' : 'rotate-180'}`} />
            </button>
        </div>
    );
}