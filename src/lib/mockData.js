export const TODAY = '2026-05-16';

export const USERS = [
    { id: 'u1', name: 'Charlie Singh', role: 'employee', manager: 'u4', email: 'charlie@atomquest.com' },
    { id: 'u2', name: 'Priya Sharma', role: 'employee', manager: 'u4', email: 'priya@atomquest.com' },
    { id: 'u3', name: 'Rajan Mehta', role: 'employee', manager: 'u4', email: 'rajan@atomquest.com' },
    { id: 'u4', name: 'Bob Fernandez', role: 'manager', email: 'bob@atomquest.com' },
    { id: 'u5', name: 'Alice Kapoor', role: 'admin', email: 'alice@atomquest.com' },
];

export const GOAL_SHEETS = [
    { id: 's1', employee_id: 'u1', cycle_year: 2026, status: 'approved' },
    { id: 's2', employee_id: 'u2', cycle_year: 2026, status: 'submitted' },
    { id: 's3', employee_id: 'u3', cycle_year: 2026, status: 'draft' },
];

export const GOALS = [
    { id: 'g1', sheet_id: 's1', title: 'Increase quarterly revenue', thrust: 'Revenue Growth', uom: 'min', target: 5000000, weightage: 30, is_shared: false, description: 'Drive top-line growth across all regions.' },
    { id: 'g2', sheet_id: 's1', title: 'Reduce customer churn rate', thrust: 'Retention', uom: 'max', target: 5, weightage: 20, is_shared: false, description: 'Keep churn under 5% annually.' },
    { id: 'g3', sheet_id: 's1', title: 'Launch product v2.0', thrust: 'Product Delivery', uom: 'timeline', target_date: '2026-09-30', weightage: 20, is_shared: false, description: 'Ship v2 on schedule.' },
    { id: 'g4', sheet_id: 's1', title: 'Zero critical incidents', thrust: 'Reliability', uom: 'zero', target: 0, weightage: 15, is_shared: true, description: 'Maintain platform reliability.' },
    { id: 'g5', sheet_id: 's1', title: 'Grow team headcount', thrust: 'People', uom: 'min', target: 3, weightage: 10, is_shared: false, description: 'Hire 3 senior engineers.' },
    { id: 'g6', sheet_id: 's1', title: 'Complete compliance audit', thrust: 'Governance', uom: 'zero', target: 0, weightage: 5, is_shared: false, description: 'Pass annual SOC2 audit.' },
];

export const ACHIEVEMENTS = [
    { id: 'a1', goal_id: 'g1', quarter: 'Q1', actual: 4200000, status: 'on_track' },
    { id: 'a2', goal_id: 'g2', quarter: 'Q1', actual: 4.2, status: 'on_track' },
    { id: 'a3', goal_id: 'g3', quarter: 'Q1', actual: null, status: 'on_track' },
    { id: 'a4', goal_id: 'g4', quarter: 'Q1', actual: 0, status: 'completed' },
    { id: 'a5', goal_id: 'g5', quarter: 'Q1', actual: 2, status: 'on_track' },
    { id: 'a6', goal_id: 'g6', quarter: 'Q1', actual: 0, status: 'completed' },
];

export const AUDIT_LOGS = [
    { id: 'l1', actor: 'Alice Kapoor', entity: 'goal_sheets', action: 'UNLOCK', timestamp: '2026-05-10 09:14', details: 'Unlocked Charlie Singh sheet for correction' },
    { id: 'l2', actor: 'Alice Kapoor', entity: 'goals', action: 'UPDATE', old: { weightage: 25 }, new: { weightage: 30 }, timestamp: '2026-05-10 09:16', details: 'Updated weightage on Revenue goal' },
    { id: 'l3', actor: 'Bob Fernandez', entity: 'goal_sheets', action: 'APPROVE', timestamp: '2026-05-08 14:30', details: 'Approved Charlie Singh 2026 sheet' },
    { id: 'l4', actor: 'Alice Kapoor', entity: 'goals', action: 'SHARED_PUSH', affected_employees: 3, timestamp: '2026-05-01 10:00', details: 'Pushed shared KPI to 3 employees' },
    { id: 'l5', actor: 'Alice Kapoor', entity: 'goal_sheets', action: 'LOCK', timestamp: '2026-05-10 09:20', details: 'Locked Charlie Singh sheet post-correction' },
];

export const QUARTER_WINDOWS = {
    goal_setting: { open: '2026-05-01', close: '2026-06-30' },
    Q1: { open: '2026-07-01', close: '2026-09-30' },
    Q2: { open: '2026-10-01', close: '2026-12-31' },
    Q3: { open: '2027-01-01', close: '2027-03-31' },
    Q4: { open: '2027-04-01', close: '2027-04-30' },
};

export const isWindowOpen = (key, today = TODAY) => {
    const w = QUARTER_WINDOWS[key];
    if (!w) return false;
    return today >= w.open && today <= w.close;
};
