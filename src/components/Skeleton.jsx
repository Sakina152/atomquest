export default function Skeleton({ rows = 3 }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-16" />
            ))}
        </div>
    );
}
