/**
 * Overview — the thirty-second screen.
 * What the system does, which release we are in, what is live and what is not.
 * Every card drills down to a detail page below.
 */

import { card, empty, esc, pageHead, pill, sampleTag, section, status } from '../ui.js';
import { currentRelease, daysBetween, formatDate, formatDateTime, storiesFor, todayISO } from '../store.js';

const H = '#/overview';

/* ---------------- helpers ---------------- */

function releaseProgress(rel) {
  const total = daysBetween(rel.start, rel.end) + 1;
  const elapsed = daysBetween(rel.start, todayISO()) + 1;
  const day = Math.min(Math.max(elapsed, 0), total);
  return { total, day, pct: Math.round((day / total) * 100), started: elapsed > 0 };
}

function statusCounts(stories) {
  const c = { done: 0, in_progress: 0, not_started: 0, unknown: 0 };
  stories.forEach((s) => { c[s.status || 'unknown'] += 1; });
  return c;
}

function timelineStrip(data, rel) {
  return `<div class="timeline">${data.releases.map((r) => `
    <div class="seg-r ${r.id === rel.id ? 'now' : ''} ${r.demoTarget ? 'demo' : ''}">
      <span class="rid">${esc(r.id.toUpperCase())}</span>
      ${r.demoTarget ? pill('demo target', 'accent') : ''}
      <span class="rn">${esc(r.name)}<br>${formatDate(r.start)} → ${formatDate(r.end)}</span>
    </div>`).join('')}</div>`;
}

/* ---------------- the tab ---------------- */

export function render(data) {
  const rel = currentRelease(data.releases);
  const prog = releaseProgress(rel);
  const relStories = storiesFor(data, rel.id);
  const demoRel = data.releases.find((r) => r.demoTarget);

  const connected = data.systems.filter((s) => s.status === 'connected').length;
  const enforced = data.guardrails.filter((g) => g.enforcedBy).length;
  const counts = statusCounts(data.stories);
  const haveStatus = Boolean(data.sources.buildStatus);

  const musts = data.requirements.filter((r) => r.priority === 'must').length;

  const cards = [
    card({
      label: 'Release in flight',
      value: `${esc(rel.id.toUpperCase())} <span style="font-size:15px;font-weight:550;color:var(--text-muted)">${esc(rel.name)}</span>`,
      note: prog.started
        ? `Day ${prog.day} of ${prog.total} · ${formatDate(rel.start)} → ${formatDate(rel.end)}`
        : `Starts ${formatDate(rel.start)}`,
      foot: `${relStories.length} stories · demo target is <b>${esc(demoRel.id.toUpperCase())} ${esc(demoRel.name)}</b>`,
      href: `${H}/current-release`,
    }),

    card({
      label: 'What is live',
      value: data.live.length ? `${data.live.length} capabilit${data.live.length === 1 ? 'y' : 'ies'}` : 'Nothing yet',
      muted: data.live.length === 0,
      sample: data.sample && data.live.length > 0,
      note: data.live.length
        ? esc(data.live.map((c) => c.name).join(' · '))
        : 'No capability has shipped. The first release is still in flight.',
      foot: `Evidence source: ${data.sources.buildStatus ? esc(data.sources.buildStatus) : '<b>none connected</b>'}`,
      href: `${H}/live`,
    }),

    card({
      label: 'Systems connected',
      value: `${connected} <span style="color:var(--text-faint);font-weight:500">of ${data.systems.length}</span>`,
      muted: connected === 0,
      note: data.systems
        .map((s) => `${status(s.status, s.lastChecked ? formatDateTime(s.lastChecked) : null, { sample: Boolean(s._sample) })} &nbsp;${esc(s.name)}`)
        .join('<br>'),
      href: `${H}/systems`,
    }),

    card({
      label: 'Guardrails enforced',
      value: `${enforced} <span style="color:var(--text-faint);font-weight:500">of ${data.guardrails.length}</span>`,
      muted: enforced === 0,
      sample: data.sample && enforced > 0,
      note: enforced === 0
        ? 'Three promises are on record. Nothing in the build enforces them yet.'
        : 'Enforcement is claimed for some guardrails — verify before demoing.',
      foot: data.guardrails.map((g) => esc(g.id)).join(' · '),
      href: `${H}/guardrails`,
    }),
  ].join('');

  const row2 = [
    card({
      label: 'Scope on record',
      value: `${data.requirements.length} <span style="font-size:15px;font-weight:550;color:var(--text-muted)">requirements</span>`,
      note: `${musts} must · ${data.requirements.length - musts} should`,
      foot: `${data.stories.length} stories across ${data.releases.length} releases`,
      href: `${H}/scope`,
    }),

    card({
      label: 'Outcomes — numbers this has to move',
      value: data.outcomes.length ? `${data.outcomes.length} measures` : 'None defined',
      muted: data.outcomes.length === 0,
      sample: data.sample && data.outcomes.length > 0,
      note: data.outcomes.length
        ? esc(data.outcomes.map((o) => o.name).join(' · '))
        : 'The plan carries no numeric target yet. Nothing here is a KPI until you set one.',
      href: `${H}/outcomes`,
    }),

    card({
      label: 'Dates',
      value: `Demo ${formatDate(data.milestones.demoDay)}`,
      note: `${daysBetween(todayISO(), data.milestones.demoDay)} days away · build ends ${formatDate(data.milestones.buildEnd)}`,
      foot: 'The week between build end and demo day is demo prep.',
      href: `${H}/dates`,
    }),
  ].join('');

  /* delivery status — honest about having no source */
  const delivery = haveStatus
    ? `<div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Status</th><th>Stories</th><th></th></tr></thead>
        <tbody>
          ${['done', 'in_progress', 'not_started'].map((k) => `<tr>
            <td><span class="status-line"><span class="dot ${k}"></span>${k.replace('_', ' ')}</span>${sampleTag(data.sample)}</td>
            <td><b>${counts[k]}</b> of ${data.stories.length}</td>
            <td style="width:55%"><div class="bar"><i style="width:${(counts[k] / data.stories.length) * 100}%"></i></div></td>
          </tr>`).join('')}
        </tbody></table></div>`
    : empty(
        'No build-status source is connected',
        `All ${data.stories.length} stories are on record with owners and due dates, but nothing reports whether they are done. ` +
        'The Command Center will not guess a completion figure.',
        'To fill this in: point <span class="mono">SOURCES.buildStatus</span> in <span class="mono">data/project.js</span> at wherever delivery is actually tracked.'
      );

  const whatItDoes = `<div class="card prose" style="padding:18px 20px">
    <p>${esc(data.meta.tagline)}</p>
    <p>On the requirements as written, that means: read practice-test summaries from
    <b>Bluebook</b>, find the categories a student is weak in, and generate targeted problems —
    a chosen type, a chosen number — with worked examples and strategies when they get stuck.
    It remembers a student's interactions for at least a month, logs everything for audit,
    and holds drafts for human approval before anything is sent.</p>
    <p style="margin-bottom:0"><a href="#/overview/what-it-does" style="color:var(--accent);font-weight:550">Read the full description ›</a></p>
  </div>`;

  const honesty = data.sample
    ? ''
    : section('What this page is not claiming', null, `<div class="grid c2">
        ${['No outcome number, because no target has been set.',
           'No connection is green, because nothing has been connected or checked.',
           'No capability is live, because nothing has shipped.',
           'No percentage complete, because no status source is wired up.']
          .map((t) => `<div class="card" style="padding:13px 15px"><div class="card-note" style="margin:0">${esc(t)}</div></div>`).join('')}
      </div>`);

  return `
    ${pageHead('Command Center', data.meta.name, esc(data.meta.tagline))}
    <div class="grid c4">${cards}</div>
    <div class="grid c3" style="margin-top:14px">${row2}</div>

    ${section('What this system does', null, whatItDoes)}

    ${section('Releases', `${data.releases.length} releases · build ${formatDate(data.milestones.buildStart)} → ${formatDate(data.milestones.buildEnd)}`,
      timelineStrip(data, rel), { href: '#/plan', label: 'Project management' })}

    ${section('Delivery status', haveStatus ? `source: ${esc(data.sources.buildStatus)}` : 'no source connected', delivery)}

    ${honesty}
  `;
}

/* ---------------- drill-downs ---------------- */

export const DETAILS = {
  'current-release': (data) => {
    const rel = currentRelease(data.releases);
    const prog = releaseProgress(rel);
    const rows = storiesFor(data, rel.id);
    return {
      title: `${rel.id.toUpperCase()} · ${rel.name}`,
      html: `
      ${pageHead('Release in flight', `${rel.id.toUpperCase()} — ${rel.name}`,
        `${formatDate(rel.start)} → ${formatDate(rel.end)} · day ${prog.day} of ${prog.total}`)}
      <div class="card" style="padding:18px 20px">
        <dl class="kv">
          <dt>Stories</dt><dd>${rows.length}</dd>
          <dt>Window</dt><dd>${formatDate(rel.start)} → ${formatDate(rel.end)} (${prog.total} days)</dd>
          <dt>Elapsed</dt><dd>Day ${prog.day} of ${prog.total}<div class="bar" style="max-width:320px"><i style="width:${prog.pct}%"></i></div></dd>
          <dt>Demo target</dt><dd>${rel.demoTarget ? 'Yes — this is the release being demoed.' : `No. The demo target is <b>${esc(data.releases.find((r) => r.demoTarget).id.toUpperCase())}</b>.`}</dd>
          <dt>Reported progress</dt><dd>${data.sources.buildStatus ? `via ${esc(data.sources.buildStatus)}${sampleTag(data.sample)}` : '<span style="color:var(--text-faint)">Not tracked — no status source connected.</span>'}</dd>
        </dl>
      </div>
      ${section('Stories in this release', null, `<div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Story</th><th>Due</th><th>Owner</th><th>Requirement</th><th>Status</th></tr></thead>
        <tbody>${rows.map((s) => `<tr>
          <td><b>${esc(s.id)}</b><br><span style="color:var(--text-muted)">${esc(s.title)}</span></td>
          <td>${formatDate(s.due)}</td>
          <td>${esc(s.owner)}</td>
          <td class="mono">${s.reqs.map(esc).join(', ')}</td>
          <td>${s.status
            ? `<span class="status-line"><span class="dot ${s.status}"></span>${s.status.replace('_', ' ')}</span>${sampleTag(data.sample)}`
            : '<span class="status-line"><span class="dot unknown"></span>Not tracked</span>'}</td>
        </tr>`).join('')}</tbody></table></div>`)}
      ${section('Every release', null, timelineStrip(data, rel), { href: '#/plan', label: 'Project management' })}`,
    };
  },

  live: (data) => ({
    title: 'What is live',
    html: `
      ${pageHead('Overview', 'What is live', 'Capabilities the system can actually perform right now, with the evidence for each.')}
      ${data.live.length
        ? `<div class="grid c2">${data.live.map((c) => card({
            label: 'Live capability', value: esc(c.name), sample: Boolean(c._sample),
            note: `Since ${formatDate(c.since)}`, foot: esc(c.evidence), href: '#/overview/live',
          })).join('')}</div>`
        : empty('Nothing is live yet',
            'No capability has shipped. The first release (r0 · Initial Setup and Trust Spine) is still in flight, ' +
            'and no build-status source is connected to report otherwise.',
            'This page fills itself from <span class="mono">LIVE_CAPABILITIES</span> in <span class="mono">data/project.js</span>. ' +
            'Add an entry only when the capability is demonstrable, with the evidence that shows it.')}`,
  }),

  systems: (data) => ({
    title: 'Systems',
    html: `
      ${pageHead('Overview', 'Systems this connects to', 'One row per system, with a live indicator and the time it was last checked.')}
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>System</th><th>Status</th><th>Last checked</th><th>Required by</th></tr></thead>
        <tbody>${data.systems.map((s) => `<tr>
          <td><b>${esc(s.name)}</b><br><span style="color:var(--text-muted)">${esc(s.purpose)}</span></td>
          <td><span class="status-line"><span class="dot ${s.status}"></span>${
            { connected: 'Connected', not_connected: 'Not connected', error: 'Error', unknown: 'Unknown' }[s.status]
          }</span>${sampleTag(Boolean(s._sample))}${s.detail ? `<div class="card-note">${esc(s.detail)}</div>` : ''}</td>
          <td>${s.lastChecked ? formatDateTime(s.lastChecked) : '<span style="color:var(--text-faint)">Never</span>'}</td>
          <td class="mono">${s.requiredBy.map(esc).join(', ')}</td>
        </tr>`).join('')}</tbody></table></div>
      ${data.systems.every((s) => s.status !== 'connected')
        ? `<div style="margin-top:14px">${empty('Nothing is connected on day one',
            'That is expected. The indicator stays grey until a health check has actually run — it will not default to green.',
            'Wire <span class="mono">SOURCES.healthChecks</span> in <span class="mono">data/project.js</span> to start reporting real connectivity.')}</div>`
        : ''}`,
  }),

  guardrails: (data) => ({
    title: 'Guardrails',
    html: `
      ${pageHead('Overview', 'Guardrails', 'The promises this system makes, and whether anything in the build currently enforces them.')}
      <div class="grid c3">${data.guardrails.map((g) => card({
        label: `${g.id} · ${g.priority}`,
        value: g.enforcedBy ? 'Enforced' : 'Not enforced',
        muted: !g.enforcedBy,
        sample: Boolean(g._sample && g.enforcedBy),
        note: esc(g.text),
        foot: g.enforcedBy
          ? `By: ${esc(g.enforcedBy)}${g.coverage ? ` · ${esc(g.coverage)}` : ''}`
          : `Planned in ${esc(data.stories.find((s) => s.reqs.includes(g.id))?.id || 'no story')}`,
        href: '#/overview/guardrails',
      })).join('')}</div>
      ${data.guardrails.every((g) => !g.enforcedBy)
        ? `<div style="margin-top:14px">${empty('Nothing enforces these yet',
            'All three guardrails are on record and each has a story behind it, but no code in the build asserts them today.',
            'Set <span class="mono">enforcedBy</span> on the requirement in <span class="mono">data/project.js</span> when — and only when — something real enforces it.')}</div>`
        : ''}`,
  }),

  scope: (data) => {
    const byKind = {};
    data.requirements.forEach((r) => { (byKind[r.kind] ||= []).push(r); });
    return {
      title: 'Scope on record',
      html: `
      ${pageHead('Overview', 'Scope on record', `${data.requirements.length} requirements · ${data.stories.length} stories · ${data.releases.length} releases`)}
      <div class="grid c4">${Object.entries(byKind).map(([kind, rs]) => card({
        label: kind, value: String(rs.length),
        note: `${rs.filter((r) => r.priority === 'must').length} must · ${rs.filter((r) => r.priority === 'should').length} should`,
        href: '#/overview/scope',
      })).join('')}</div>
      ${section('Requirements', null, `<div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>ID</th><th>Kind</th><th>Priority</th><th>Requirement</th><th>Stories</th></tr></thead>
        <tbody>${data.requirements.map((r) => `<tr>
          <td class="mono"><b>${esc(r.id)}</b></td>
          <td>${pill(r.kind, r.kind === 'SAFE' ? 'warn' : '')}</td>
          <td>${esc(r.priority)}</td>
          <td>${esc(r.text)}</td>
          <td class="mono">${data.stories.filter((s) => s.reqs.includes(r.id)).map((s) => esc(s.id)).join(', ') || '<span style="color:var(--text-faint)">—</span>'}</td>
        </tr>`).join('')}</tbody></table></div>`)}`,
    };
  },

  outcomes: (data) => ({
    title: 'Outcomes',
    html: `
      ${pageHead('Overview', 'Outcomes — the numbers this has to move', 'One card per measure, with a baseline, a target and where it is now.')}
      ${data.outcomes.length
        ? `<div class="grid c2">${data.outcomes.map((o) => card({
            label: o.name, value: esc(o.current), sample: Boolean(o._sample),
            note: `${esc(o.measure)}<br>Baseline ${esc(o.baseline)} → target <b>${esc(o.target)}</b>`,
            foot: `Owner: ${esc(o.owner)}`, href: '#/outcomes',
          })).join('')}</div>`
        : empty('No numeric target is defined yet',
            'The plan this was built from carries no measurable outcome — no baseline, no target, no measure. ' +
            'Rather than invent one, this tab stays empty and keeps room for one card per measure.',
            'This is worth fixing before r1: without a target, there is no way to say whether the agent helped anyone.')}`,
  }),

  dates: (data) => {
    const m = data.milestones;
    const demoRel = data.releases.find((r) => r.demoTarget);
    return {
      title: 'Dates',
      html: `
      ${pageHead('Overview', 'Dates', 'The fixed points in the programme.')}
      <div class="grid c4">
        ${card({ label: 'Build starts', value: formatDate(m.buildStart), note: `${daysBetween(m.buildStart, todayISO())} days ago`, href: '#/overview/dates' })}
        ${card({ label: 'Build ends', value: formatDate(m.buildEnd), note: `in ${daysBetween(todayISO(), m.buildEnd)} days`, href: '#/overview/dates' })}
        ${card({ label: 'Demo prep', value: formatDate(m.demoPrepStart), note: 'The week between build end and demo day', href: '#/overview/dates' })}
        ${card({ label: 'Demo day', value: formatDate(m.demoDay), note: `in ${daysBetween(todayISO(), m.demoDay)} days`, href: '#/overview/dates' })}
      </div>
      ${section('Against the releases', `demo target: ${demoRel.id.toUpperCase()} — releases after it are roadmap, not this term's work`,
        timelineStrip(data, currentRelease(data.releases)), { href: '#/plan', label: 'Project management' })}`,
    };
  },

  'what-it-does': (data) => ({
    title: 'What this system does',
    html: `
      ${pageHead('Overview', 'What this system does', 'Taken from the requirements on record — nothing here describes behaviour that has not been specified.')}
      <div class="card prose" style="padding:20px">
        <p>${esc(data.meta.tagline)}</p>
      </div>
      ${section('The behaviour, requirement by requirement', null, `<div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>ID</th><th>Behaviour</th><th>Kind</th><th>Delivered by</th></tr></thead>
        <tbody>${data.requirements.map((r) => `<tr>
          <td class="mono"><b>${esc(r.id)}</b></td>
          <td>${esc(r.text)}</td>
          <td>${pill(r.kind, r.kind === 'SAFE' ? 'warn' : '')}</td>
          <td class="mono">${data.stories.filter((s) => s.reqs.includes(r.id)).map((s) => `${esc(s.id)} (${esc(s.release)})`).join('<br>') || '<span style="color:var(--text-faint)">no story</span>'}</td>
        </tr>`).join('')}</tbody></table></div>`)}`,
  }),
};
