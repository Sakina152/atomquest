const MAP = {
    draft: 'bg-gray-100 text-gray-600 border-gray-300',
    submitted: 'bg-amber-100 text-amber-700 border-amber-300',
    approved: 'bg-green-100 text-green-700 border-green-300',
    locked: 'bg-blue-100 text-blue-700 border-blue-300',
    on_track: 'bg-green-100 text-green-700 border-green-300',
    completed: 'bg-blue-100 text-blue-700 border-blue-300',
    at_risk: 'bg-amber-100 text-amber-700 border-amber-300',
    off_track: 'bg-red-50 text-red-600 border-red-300',
};

export default function StatusBadge({ status, className = '' }) {
    const cls = MAP[status] || 'bg-gray-100 text-gray-600 border-gray-300';
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${cls} ${className}`}>
            {status?.replace('_', ' ')}
        </span>
    );
}
