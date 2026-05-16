import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const push = useCallback((message, variant = 'success') => {
        const id = Math.random().toString(36).slice(2);
        setToasts((t) => [...t, { id, message, variant }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
    }, []);
    return (
        <ToastCtx.Provider value={{ push }}>
            {children}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[90vw]">
                {toasts.map((t) => {
                    const Icon = t.variant === 'error' ? AlertCircle : t.variant === 'info' ? Info : CheckCircle2;
                    const styles =
                        t.variant === 'error'
                            ? 'bg-red-50 text-red-700 border-red-300'
                            : t.variant === 'info'
                                ? 'bg-blue-50 text-blue-700 border-blue-300'
                                : 'bg-green-50 text-green-700 border-green-300';
                    return (
                        <div key={t.id} className={`flex items-start gap-2 p-3 rounded-lg border shadow-sm animate-in slide-in-from-right ${styles}`}>
                            <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            <p className="text-sm font-medium flex-1">{t.message}</p>
                            <button onClick={() => setToasts((tt) => tt.filter((x) => x.id !== t.id))}>
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastCtx.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastCtx);
    if (!ctx) return { push: () => { } };
    return ctx;
}
