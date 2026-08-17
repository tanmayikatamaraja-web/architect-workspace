/**
 * Placeholder for tabs not built yet. It states plainly that the tab is not
 * built rather than showing a hollow page that looks finished.
 */

import { empty, esc, pageHead } from '../ui.js';

const PLAN = {
  outcomes: {
    sub: 'The numbers this has to move.',
    what: 'One card per measure with baseline, target and current value — and, on real data today, an empty state saying no numeric target has been defined.',
  },
  users: {
    sub: 'Who this is for and what they are trying to get done.',
    what: 'The roles taken from the stories (student, system administrator, high school student), each drilling into the stories written for them.',
  },
  guardrails: {
    sub: 'What must never happen.',
    what: 'The three SAFE requirements (REQ-007, REQ-009, REQ-012) with, for each, whether anything in the build currently enforces it.',
  },
  systems: {
    sub: 'What this connects to.',
    what: 'One row per system with a live indicator and a last-checked time. Collegeboard is the only one, and it is not connected.',
  },
  plan: {
    sub: 'Releases and tasks.',
    what: 'A Gantt view of the five releases with r1 marked as the demo target, and every story below it with its due date, each clickable.',
  },
  agents: {
    sub: 'Who owns what.',
    what: 'One card per story owner, labelled as owners rather than scoped AI agents, each showing "no skills registered yet" on real data.',
  },
  knowledge: {
    sub: 'Everything the project knows about itself.',
    what: 'Requirements, stories, decisions and notes, plus a chat panel that answers from this data and cites the tab it came from — or says it cannot answer.',
  },
  model: {
    sub: 'The tables behind all of the above.',
    what: 'A proposed data model derived from the requirements, shown for review before any table is created.',
  },
};

export function render(tab) {
  const p = PLAN[tab.id] || { sub: '', what: '' };
  return `
    ${pageHead(`Tab ${tab.n} of 9`, tab.label, esc(p.sub))}
    ${empty('Not built yet',
      `This tab is reachable and reserved, but nothing has been built behind it. ${esc(p.what)}`,
      'The Overview tab was built first, on request. This one comes next — it will read from the same single data source in <span class="mono">data/project.js</span>.')}`;
}
