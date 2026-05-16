import { useState } from 'react';
import { Target, ArrowRight, User, Briefcase, Shield } from 'lucide-react';
import { USERS } from '../lib/mockData';

const CARDS = [
    { id: 'u1', label: 'Employee', icon: User, color: 'from-indigo-500 to-blue-500' },
    { id: 'u4', label: 'Manager', icon: Briefcase, color: 'from-purple-500 to-pink-500' },
    { id: 'u5', label: 'Admin/HR', icon: Shield, color: 'from-emerald-500 to-teal-500' },
];

export default function Login({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Target className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900">AtomQuest</h1>
                    </div>
                    <p className="text-slate-600">Goal Setting & Tracking Portal</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 max-w-md mx-auto">
                    <h2 className="text-xl font-semibold text-slate-900 mb-4">Sign in</h2>
                    <form onSubmit={(e) => { e.preventDefault(); onLogin('u1'); }} className="space-y-3">
                        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
                        <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
                        <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2">
                            Sign in <ArrowRight className="w-4 h-4" />
                        </button>
                    </form>
                </div>

                <div>
                    <p className="text-center text-sm text-slate-500 mb-4">Or jump in as a demo user</p>
                    <div className="grid md:grid-cols-3 gap-4">
                        {CARDS.map((c) => {
                            const u = USERS.find((x) => x.id === c.id);
                            const Icon = c.icon;
                            return (
                                <button key={c.id} onClick={() => onLogin(c.id)} className="group bg-white rounded-2xl p-6 shadow-md hover:shadow-2xl border border-gray-100 hover:border-indigo-200 hover:-translate-y-1 transition-all text-left">
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center mb-4`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="text-xs uppercase text-slate-500 font-semibold tracking-wide">{c.label}</div>
                                    <div className="font-bold text-slate-900 mt-1">{u.name}</div>
                                    <div className="text-sm text-slate-500 mt-0.5">{u.email}</div>
                                    <div className="mt-4 text-sm text-indigo-600 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                                        Continue <ArrowRight className="w-4 h-4" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
