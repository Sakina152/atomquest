export function computeScore(goal, achievement) {
    if (!goal || !achievement) return 0;
    switch (goal.uom) {
        case 'min':
            if (!achievement.actual) return 0;
            return Math.min((achievement.actual / goal.target) * 100, 100);
        case 'max':
            if (!achievement.actual) return 0;
            return Math.min((goal.target / achievement.actual) * 100, 100);
        case 'zero':
            return achievement.actual === 0 ? 100 : 0;
        case 'timeline':
            return achievement.status === 'completed' ? 100 : 0;
        default:
            return 0;
    }
}

export function scoreColor(score) {
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 50) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
}

export function weightedFinal(goals, achievementsByGoalId) {
    let total = 0;
    for (const g of goals) {
        const a = achievementsByGoalId[g.id];
        if (!a) continue;
        total += (computeScore(g, a) * g.weightage) / 100;
    }
    return total;
}
