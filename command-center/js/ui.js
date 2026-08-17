/** Small render helpers shared by every tab. No project facts live here. */

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Marker shown next to anything that came from the sample overlay. */
export const sampleTag = (on = true) => (on ? '<span class="tag-sample">sample</span>' : '');

const STATUS_TEXT = {
  unknown: 'Unknown',
  not_connected: 'Not connected',
  connected: 'Connected',
  error: 'Error',
  done: 'Done',
  in_progress: 'In progress',
  not_started: 'Not started',
};

/**
 * Status dot + label + last-checked time.
 * Anything unknown or unchecked stays grey. Never default to green.
 */
export function status(state, lastChecked, { sample = false } = {}) {
  const key = state && STATUS_TEXT[state] ? state : 'unknown';
  const checked = lastChecked
    ? `checked ${esc(lastChecked)}`
    : 'never checked';
  return `<span class="status-line"><span class="dot ${key}"></span>${STATUS_TEXT[key]}${sampleTag(sample)}
    <span class="checked">· ${checked}</span></span>`;
}

/**
 * A card. Every card drills down — `href` is required, even when there is
 * nothing behind it yet (the detail page then explains what has to happen
 * first).
 */
export function card({ label, value, note, foot, href, muted = false, sample = false, span = false }) {
  return `<a class="card${span ? ' span2' : ''}" href="${href}">
    <div class="card-label">${esc(label)}</div>
    <div class="card-value${muted ? ' none' : ''}">${value}${sampleTag(sample)}</div>
    ${note ? `<div class="card-note">${note}</div>` : ''}
    ${foot ? `<div class="card-foot">${foot}</div>` : ''}
  </a>`;
}

export function empty(title, body, next) {
  return `<div class="empty">
    <strong>${esc(title)}</strong>
    <div>${body}</div>
    ${next ? `<div class="next">${next}</div>` : ''}
  </div>`;
}

export function pageHead(eyebrow, title, sub) {
  return `<div class="page-head">
    ${eyebrow ? `<div class="eyebrow">${esc(eyebrow)}</div>` : ''}
    <h1 class="page-title">${esc(title)}</h1>
    ${sub ? `<p class="page-sub">${sub}</p>` : ''}
  </div>`;
}

export function section(title, note, body, more) {
  return `<div class="section">
    <div class="section-head">
      <h2 class="section-title">${esc(title)}</h2>
      ${note ? `<span class="section-note">${note}</span>` : ''}
      ${more ? `<a class="more" href="${more.href}">${esc(more.label)} ›</a>` : ''}
    </div>
    ${body}
  </div>`;
}

export const pill = (text, kind = '') => `<span class="pill ${kind}">${esc(text)}</span>`;
