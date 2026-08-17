/**
 * Data layer. Every view reads from getData() and nothing else.
 *
 * Mode: 'real'   -> only what the project has actually produced.
 *       'sample' -> real project facts + a labelled sample overlay for the
 *                   parts that are not known yet.
 */

import * as P from '../data/project.js';
import * as S from '../data/sample.js';

const KEY = 'cc.mode';
const listeners = new Set();

// ?data=sample / ?data=real sets the starting mode (useful for links and
// screenshots); otherwise the last choice is remembered. Real is the default.
const fromUrl = new URLSearchParams(location.search).get('data');
let mode = (fromUrl === 'sample' || fromUrl === 'real')
  ? fromUrl
  : (localStorage.getItem(KEY) === 'sample' ? 'sample' : 'real');

export function getMode() {
  return mode;
}

export function setMode(next) {
  if (next !== 'real' && next !== 'sample') return;
  mode = next;
  localStorage.setItem(KEY, mode);
  listeners.forEach((fn) => fn(mode));
}

export function onModeChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const isSampleMode = () => mode === 'sample';

/** Build the view of the world for the current mode. */
export function getData() {
  const sample = mode === 'sample';

  const stories = P.STORIES.map((st) => ({
    ...st,
    status: sample ? S.STORY_STATUS[st.id] ?? null : null,
    _sampleStatus: sample,
  }));

  const systems = P.SYSTEMS.map((sys) => {
    const o = sample ? S.SYSTEM_STATUS[sys.id] : null;
    return o ? { ...sys, ...o } : { ...sys };
  });

  const requirements = P.REQUIREMENTS.map((r) => {
    const o = sample ? S.GUARDRAIL_ENFORCEMENT[r.id] : null;
    return o ? { ...r, ...o } : { ...r };
  });

  const owners = P.OWNERS.map((o) => {
    const skills = sample ? S.OWNER_SKILLS[o.name] ?? [] : [];
    return {
      ...o,
      skills,
      _sampleSkills: sample && skills.length > 0,
      stories: P.STORIES.filter((st) => st.owner === o.name).map((st) => st.id),
    };
  });

  return {
    mode,
    sample,
    meta: P.META,
    milestones: P.MILESTONES,
    releases: P.RELEASES,
    requirements,
    guardrails: requirements.filter((r) => r.kind === 'SAFE'),
    stories,
    roles: P.ROLES,
    owners,
    systems,
    outcomes: sample ? S.OUTCOMES : P.OUTCOMES,
    notes: sample ? S.NOTES : P.NOTES,
    live: sample ? S.LIVE_CAPABILITIES : P.LIVE_CAPABILITIES,
    sources: sample
      ? { buildStatus: 'sample', telemetry: 'sample', healthChecks: 'sample' }
      : P.SOURCES,
  };
}

/* ---------- derived helpers, shared by every tab ---------- */

export const TODAY = new Date();

export function parseDate(d) {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day);
}

export function daysBetween(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}

export function todayISO() {
  const d = TODAY;
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function daysFromToday(iso) {
  return daysBetween(todayISO(), iso);
}

/** Which release the calendar says we are in right now. */
export function currentRelease(releases) {
  const t = todayISO();
  return (
    releases.find((r) => t >= r.start && t <= r.end) ||
    releases.find((r) => t < r.start) ||
    releases[releases.length - 1]
  );
}

export function storiesFor(data, releaseId) {
  return data.stories.filter((s) => s.release === releaseId);
}

export function releaseById(data, id) {
  return data.releases.find((r) => r.id === id);
}

export function formatDate(iso) {
  if (!iso) return null;
  const d = parseDate(iso.slice(0, 10));
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
