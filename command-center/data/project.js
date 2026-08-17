/**
 * THE SINGLE SOURCE OF TRUTH.
 *
 * Everything the Command Center displays in REAL mode comes from this file.
 * When the real system exists, this module is what gets pointed at it
 * (swap the literals for fetch() calls that return the same shapes).
 * No view file should ever contain a project fact.
 *
 * Rules for editing:
 *  - `null` means "we do not know this yet". It renders as an honest empty
 *    state. Never replace a null with a guess.
 *  - Anything that can be connected/disconnected carries {status, lastChecked}.
 *    lastChecked: null means never checked -> grey dot, not green.
 */

export const META = {
  name: 'AI SAT Study Agent',
  tagline:
    'An AI Agent designed to assist high school students in preparing for the SAT by analyzing practice test results and generating targeted practice problems.',
  // No brand colours have been chosen for this project yet.
  // The palette lives in assets/theme.css -- one line to change later.
  brandColours: null,
};

export const MILESTONES = {
  buildStart: '2026-08-15',
  buildEnd: '2026-10-01',
  demoPrepStart: '2026-10-02',
  demoDay: '2026-10-08',
};

export const RELEASES = [
  {
    id: 'r0',
    name: 'Initial Setup and Trust Spine',
    start: '2026-08-15',
    end: '2026-08-23',
    demoTarget: false,
    storyIds: ['STORY-001', 'STORY-002', 'STORY-012', 'STORY-013'],
  },
  {
    id: 'r1',
    name: 'Problem Exploration and Assistance',
    start: '2026-08-25',
    end: '2026-09-02',
    demoTarget: true,
    storyIds: ['STORY-003', 'STORY-004', 'STORY-005', 'STORY-014'],
  },
  {
    id: 'r2',
    name: 'Memory and Interaction Logging',
    start: '2026-09-04',
    end: '2026-09-11',
    demoTarget: false,
    storyIds: ['STORY-006', 'STORY-007', 'STORY-015', 'STORY-016'],
  },
  {
    id: 'r3',
    name: 'User Experience Enhancements',
    start: '2026-09-16',
    end: '2026-09-21',
    demoTarget: false,
    storyIds: ['STORY-008', 'STORY-009'],
  },
  {
    id: 'r4',
    name: 'Extended Data and Problem Support',
    start: '2026-09-26',
    end: '2026-10-01',
    demoTarget: false,
    storyIds: ['STORY-010', 'STORY-011'],
  },
];

/**
 * kind: FUNC | SAFE | NFR | CONSTRAINT | OBS
 * priority: must | should
 * enforcedBy: null until something in the build actually enforces it.
 */
export const REQUIREMENTS = [
  { id: 'REQ-001', kind: 'FUNC', priority: 'must', text: 'The system must read summaries of SAT practice tests from Bluebook.' },
  { id: 'REQ-002', kind: 'FUNC', priority: 'must', text: 'The system must create problems based on categories a student performs poorly in.' },
  { id: 'REQ-003', kind: 'FUNC', priority: 'must', text: 'The system must provide examples of different problem types within a category.' },
  { id: 'REQ-004', kind: 'FUNC', priority: 'must', text: 'The system must allow students to choose specific types of problems to work on.' },
  { id: 'REQ-005', kind: 'FUNC', priority: 'must', text: 'The system must generate a user-specified number of problems.' },
  { id: 'REQ-006', kind: 'FUNC', priority: 'must', text: 'The system must provide strategies for solving problems when a student is stuck.' },
  { id: 'REQ-007', kind: 'SAFE', priority: 'must', text: 'The system must ensure math problems and solutions are accurate.' },
  { id: 'REQ-008', kind: 'FUNC', priority: 'must', text: 'The system must remember student interactions and choices for at least one month.' },
  { id: 'REQ-009', kind: 'SAFE', priority: 'must', text: 'The system must queue drafts for human approval before sending.' },
  { id: 'REQ-010', kind: 'CONSTRAINT', priority: 'must', text: 'The system must connect to Collegeboard data sources.' },
  { id: 'REQ-011', kind: 'NFR', priority: 'must', text: 'The system must support high school students preparing for the SAT.' },
  { id: 'REQ-012', kind: 'SAFE', priority: 'must', text: 'The system must store data in a secure and reliable manner.' },
  { id: 'REQ-013', kind: 'NFR', priority: 'should', text: 'The system must provide a user-friendly interface for students.' },
  { id: 'REQ-014', kind: 'OBS', priority: 'must', text: 'The system must log all interactions for audit purposes.' },
  { id: 'REQ-015', kind: 'FUNC', priority: 'should', text: 'The system must allow students to review past interactions and progress.' },
  { id: 'REQ-016', kind: 'FUNC', priority: 'should', text: 'The system must provide feedback on student performance improvements.' },
  { id: 'REQ-017', kind: 'FUNC', priority: 'should', text: 'The system must handle data from multiple practice test sources.' },
  { id: 'REQ-018', kind: 'FUNC', priority: 'should', text: 'The system must support multiple problem categories beyond math.' },
].map((r) => ({ ...r, enforcedBy: null }));

/**
 * status: null means no build-status source is connected yet.
 * Do not default it to 'not started' -- that is a claim we cannot make.
 */
export const STORIES = [
  { id: 'STORY-001', title: 'Ingest SAT practice test summaries from Bluebook', due: '2026-08-15', release: 'r0', owner: 'Data Ingestion Team', role: 'system administrator', reqs: ['REQ-001'] },
  { id: 'STORY-002', title: 'Generate problems based on weak categories', due: '2026-08-18', release: 'r0', owner: 'Problem Generation Team', role: 'student', reqs: ['REQ-002'] },
  { id: 'STORY-012', title: 'Generate a user-specified number of math problems', due: '2026-08-20', release: 'r0', owner: 'Student', role: 'student', reqs: ['REQ-005'] },
  { id: 'STORY-013', title: 'Ensure accuracy of math problems and solutions', due: '2026-08-23', release: 'r0', owner: 'System', role: 'system administrator', reqs: ['REQ-007'] },

  { id: 'STORY-003', title: 'Provide examples of problem types within a category', due: '2026-08-25', release: 'r1', owner: 'Problem Exploration Team', role: 'student', reqs: ['REQ-003'] },
  { id: 'STORY-004', title: 'Allow students to choose specific problem types', due: '2026-08-28', release: 'r1', owner: 'Problem Exploration Team', role: 'student', reqs: ['REQ-004'] },
  { id: 'STORY-005', title: 'Provide strategies for solving problems', due: '2026-08-30', release: 'r1', owner: 'Problem Assistance Team', role: 'student', reqs: ['REQ-006'] },
  { id: 'STORY-014', title: 'Queue drafts for human approval before sending', due: '2026-09-02', release: 'r1', owner: 'System', role: 'system administrator', reqs: ['REQ-009'] },

  { id: 'STORY-006', title: 'Remember student interactions and choices', due: '2026-09-04', release: 'r2', owner: 'Memory Management Team', role: 'student', reqs: ['REQ-008'] },
  { id: 'STORY-007', title: 'Log all interactions for audit purposes', due: '2026-09-07', release: 'r2', owner: 'Audit Team', role: 'system administrator', reqs: ['REQ-014'] },
  { id: 'STORY-015', title: 'Support high school students preparing for the SAT', due: '2026-09-09', release: 'r2', owner: 'Student', role: 'high school student', reqs: ['REQ-011'] },
  { id: 'STORY-016', title: 'Store data in a secure and reliable manner', due: '2026-09-11', release: 'r2', owner: 'System', role: 'system administrator', reqs: ['REQ-012'] },

  { id: 'STORY-008', title: 'Enhance user interface for students with usability testing', due: '2026-09-16', release: 'r3', owner: 'UX Designer', role: 'student', reqs: ['REQ-013'] },
  { id: 'STORY-009', title: 'Provide feedback on student performance improvements', due: '2026-09-21', release: 'r3', owner: 'Feedback Team', role: 'student', reqs: ['REQ-016'] },

  { id: 'STORY-010', title: 'Integrate additional data sources for practice tests', due: '2026-09-26', release: 'r4', owner: 'Data Integration Team', role: 'system administrator', reqs: ['REQ-017'] },
  { id: 'STORY-011', title: 'Support multiple problem categories beyond math', due: '2026-10-01', release: 'r4', owner: 'Problem Generation Team', role: 'student', reqs: ['REQ-018'] },
].map((s) => ({ ...s, status: null }));

/** Roles as written in the stories ("As a <role>, I want ..."). */
export const ROLES = ['student', 'system administrator', 'high school student'];

/**
 * Story owners. These are OWNERS, not scoped AI agents -- the plan does not
 * carry an agent roster yet. The AI agents tab must say so.
 */
export const OWNERS = [
  'Data Ingestion Team',
  'Problem Generation Team',
  'Problem Exploration Team',
  'Problem Assistance Team',
  'Memory Management Team',
  'Audit Team',
  'UX Designer',
  'Feedback Team',
  'Data Integration Team',
  'Student',
  'System',
].map((name) => ({ name, skills: [], scopedAgent: false }));

/**
 * status: 'unknown' | 'not_connected' | 'connected' | 'error'
 * Day one: nothing is connected, and nothing has ever been checked.
 */
export const SYSTEMS = [
  {
    id: 'collegeboard',
    name: 'Collegeboard',
    purpose: 'Source of SAT practice test data (Bluebook summaries).',
    requiredBy: ['REQ-001', 'REQ-010', 'REQ-017'],
    status: 'not_connected',
    lastChecked: null,
  },
];

/** No numeric target has been defined for this project yet. */
export const OUTCOMES = [];

/** Free-form notes added as the programme runs. Grows, never regenerates. */
export const NOTES = [];

/**
 * Nothing has been shipped yet. Each entry would be {name, since, evidence}.
 * Empty means "nothing is live", and the Overview says exactly that.
 */
export const LIVE_CAPABILITIES = [];

/** Where run-time status would come from. null = not wired up. */
export const SOURCES = {
  buildStatus: null,   // story/release completion
  telemetry: null,     // outcome measurement
  healthChecks: null,  // system connectivity
};
