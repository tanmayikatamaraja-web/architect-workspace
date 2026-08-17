/** Shell + hash router. Re-renders on route change and on mode change. */

import { TABS, tabById } from './routes.js';
import { getData, getMode, onModeChange, setMode } from './store.js';
import { esc } from './ui.js';
import * as Overview from './views/overview.js';
import * as Stub from './views/stub.js';

const $ = (sel) => document.querySelector(sel);

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const tab = tabById(raw[0]) ? raw[0] : 'overview';
  return { tab, sub: raw[1] || null };
}

function renderNav(active) {
  $('#nav').innerHTML = `
    <div class="nav-label">Tabs</div>
    ${TABS.map((t) => `<a href="#/${t.id}" class="${t.id === active ? 'active' : ''}">
        <span class="n">${t.n}</span>${esc(t.label)}
        ${t.built ? '' : '<span class="badge-soon">soon</span>'}
      </a>`).join('')}`;
}

function renderCrumbs(tab, detailTitle) {
  const t = tabById(tab);
  $('#crumbs').innerHTML = detailTitle
    ? `<a href="#/${tab}">${esc(t.label)}</a><span class="sep">/</span><span class="here">${esc(detailTitle)}</span>`
    : `<span class="here">${esc(t.label)}</span>`;
}

function renderModeSwitch() {
  const m = getMode();
  $('#mode').innerHTML = `
    <span class="lbl">Data</span>
    <div class="seg" role="group" aria-label="Data mode">
      <button data-mode="real" aria-pressed="${m === 'real'}">Real</button>
      <button class="sample" data-mode="sample" aria-pressed="${m === 'sample'}">Sample</button>
    </div>`;
  $('#mode').querySelectorAll('button').forEach((b) =>
    b.addEventListener('click', () => setMode(b.dataset.mode)));
}

function sampleBanner(data) {
  if (!data.sample) return '';
  return `<div class="sample-banner">
    <b>Sample data</b>
    <span class="thin">Made-up values, shown to illustrate the shape of this page. Anything marked
    <span class="tag-sample">sample</span> did not come from your system. Switch to <b>Real</b> before demoing.</span>
  </div>`;
}

function route() {
  const { tab, sub } = parseHash();
  const data = getData();
  document.documentElement.dataset.mode = data.mode;

  let body = '';
  let detailTitle = null;

  if (tab === 'overview') {
    if (sub && Overview.DETAILS[sub]) {
      const d = Overview.DETAILS[sub](data);
      body = d.html;
      detailTitle = d.title;
    } else {
      body = Overview.render(data);
    }
  } else {
    body = Stub.render(tabById(tab));
  }

  renderNav(tab);
  renderCrumbs(tab, detailTitle);
  $('#content').innerHTML = sampleBanner(data) + body;
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
onModeChange(() => { renderModeSwitch(); route(); });

renderModeSwitch();
route();
