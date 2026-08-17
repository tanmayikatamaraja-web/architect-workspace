/**
 * SAMPLE OVERLAY -- believable made-up data, used only in Sample mode.
 *
 * Hard rule: this file may only fill in things REAL mode does not know
 * (nulls and empty arrays in project.js). It must never contradict a real
 * project fact -- requirements, stories, releases and dates are identical in
 * both modes. That way Sample shows you the SHAPE of the Command Center
 * without ever teaching you a false fact about your own project.
 *
 * Everything injected from here carries `_sample: true` so the UI can label
 * it on screen. Nothing should ever be demoed as real by accident.
 */

const s = (o) => ({ ...o, _sample: true });

/** Numeric targets the project would be judged on. */
export const OUTCOMES = [
  s({
    id: 'OUT-1',
    name: 'Practice score lift',
    measure: 'Average SAT practice-test score change after 4 weeks of use',
    baseline: '1120',
    target: '+80 pts',
    current: '+34 pts',
    unit: 'points',
    trend: [0, 6, 11, 9, 18, 25, 34],
    owner: 'Feedback Team',
  }),
  s({
    id: 'OUT-2',
    name: 'Weak-category coverage',
    measure: 'Share of a student\'s weak categories with generated practice available',
    baseline: '0%',
    target: '90%',
    current: '61%',
    unit: '%',
    trend: [0, 12, 24, 33, 45, 52, 61],
    owner: 'Problem Generation Team',
  }),
  s({
    id: 'OUT-3',
    name: 'Solution accuracy',
    measure: 'Generated problems whose solution passes review (REQ-007)',
    baseline: 'n/a',
    target: '99.5%',
    current: '97.2%',
    unit: '%',
    trend: [88, 91, 93, 94, 96, 96, 97.2],
    owner: 'System',
  }),
  s({
    id: 'OUT-4',
    name: 'Weekly active students',
    measure: 'Students completing at least one practice set per week',
    baseline: '0',
    target: '250',
    current: '48',
    unit: 'students',
    trend: [0, 4, 9, 15, 22, 36, 48],
    owner: 'Student',
  }),
];

/** What the system would be able to do once r0 has landed. */
export const LIVE_CAPABILITIES = [
  s({ name: 'Bluebook summary ingest', since: '2026-08-16', evidence: '312 summaries parsed' }),
  s({ name: 'Weak-category problem generation', since: '2026-08-17', evidence: '1,840 problems generated' }),
];

/** Build status per story. Real mode has no status source at all. */
export const STORY_STATUS = {
  'STORY-001': 'done',
  'STORY-002': 'in_progress',
  'STORY-012': 'in_progress',
  'STORY-013': 'not_started',
  'STORY-003': 'not_started',
  'STORY-004': 'not_started',
  'STORY-005': 'not_started',
  'STORY-014': 'not_started',
  'STORY-006': 'not_started',
  'STORY-007': 'not_started',
  'STORY-015': 'not_started',
  'STORY-016': 'not_started',
  'STORY-008': 'not_started',
  'STORY-009': 'not_started',
  'STORY-010': 'not_started',
  'STORY-011': 'not_started',
};

/** Connectivity the Command Center would report once health checks exist. */
export const SYSTEM_STATUS = {
  collegeboard: s({ status: 'error', lastChecked: '2026-08-17T09:12:00', detail: 'Auth token rejected (401) on last poll' }),
};

/** What would be enforcing each guardrail. */
export const GUARDRAIL_ENFORCEMENT = {
  'REQ-007': s({ enforcedBy: 'Solution-check pass on every generated problem', coverage: '97.2% pass rate', story: 'STORY-013' }),
  'REQ-009': s({ enforcedBy: 'Draft approval queue', coverage: '0 drafts sent unapproved', story: 'STORY-014' }),
  'REQ-012': s({ enforcedBy: null, coverage: null, story: 'STORY-016' }),
};

/** Skills per owner. Real mode has none registered. */
export const OWNER_SKILLS = {
  'Data Ingestion Team': ['PDF/score-report parsing', 'Bluebook schema mapping', 'Deduplication'],
  'Problem Generation Team': ['SAT item authoring', 'Difficulty calibration', 'Distractor design'],
  'Problem Exploration Team': ['Category taxonomy', 'Worked-example selection'],
  'Problem Assistance Team': ['Hint laddering', 'Strategy explanation'],
  'Memory Management Team': ['Session memory', 'Retention policy (30 days)'],
  'Audit Team': ['Interaction logging', 'Audit trail export'],
  'UX Designer': ['Usability testing', 'Student-facing IA'],
  'Feedback Team': ['Progress analytics', 'Improvement reporting'],
  'Data Integration Team': ['Third-party test sources', 'Schema reconciliation'],
  'Student': ['—'],
  'System': ['Accuracy checking', 'Secure storage'],
};

export const NOTES = [
  s({ id: 'N-1', date: '2026-08-16', title: 'Bluebook exports are PDF-only', body: 'No API found; ingest goes via the downloadable score report. Affects REQ-001 and STORY-001.' }),
  s({ id: 'N-2', date: '2026-08-17', title: 'Accuracy bar set at 99.5%', body: 'Anything below and REQ-007 is not satisfied for launch. Drives STORY-013 scope.' }),
];
