/**
 * computeScore — returns 0-100 progress score for a single goal + achievement pair.
 * Handles both Supabase column names (uom_type, target_value, actual_value)
 * and legacy mock-data field names (uom, target, actual) via fallbacks.
 */
export function computeScore(goal, achievement) {
    if (!goal || !achievement) return 0;

    const uom = goal.uom_type || goal.uom;
    const target = Number(goal.target_value ?? goal.target ?? 0);
    const actual = Number(achievement.actual_value ?? achievement.actual ?? null);

    switch (uom) {
        case 'min':
            // Higher is better — e.g. Sales Revenue: Achievement ÷ Target
            if (!target || actual === null || isNaN(actual)) return 0;
            return Math.min((actual / target) * 100, 100);

        case 'max':
            // Lower is better — e.g. TAT, Cost: Target ÷ Achievement
            if (!actual || actual === 0) return 0;
            return Math.min((target / actual) * 100, 100);

        case 'zero':
            // Zero = success — e.g. Safety incidents: if 0 → 100%, else 0%
            return actual === 0 ? 100 : 0;

        case 'timeline': {
            // Date-based: compare completion date vs deadline
            // If status is 'completed' we check whether actual_value (completion date)
            // was on or before target_date (deadline). If no actual date, use status only.
            const deadline = goal.target_date;
            const completionDate = achievement.actual_value || achievement.actual;
            const status = achievement.status;

            if (status === 'completed') {
                if (deadline && completionDate) {
                    // On time or early → 100%, late → 0%
                    return completionDate <= deadline ? 100 : 0;
                }
                return 100; // completed with no date info → give full credit
            }
            return 0;
        }

        default:
            return 0;
    }
}

export function scoreColor(score) {
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 50) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
}

/**
 * weightedFinal — returns the overall weighted score (0-100) for a set of goals.
 * achievementsByGoalId is keyed by goal.id → achievement row.
 */
export function weightedFinal(goals, achievementsByGoalId) {
    let total = 0;
    for (const g of goals) {
        const a = achievementsByGoalId[g.id];
        if (!a) continue;
        total += (computeScore(g, a) * Number(g.weightage || 0)) / 100;
    }
    return total;
}
