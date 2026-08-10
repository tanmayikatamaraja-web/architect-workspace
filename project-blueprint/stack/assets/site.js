/* ============================================================================
   site.js — shared rendering, navigation, search, figures, copy buttons and
   the Ask agent for the Pre-Med Study Desk tech-stack knowledge base.

   Classic script. Reads the bare global lexical binding STACK defined in
   assets/stack.js (NOT window.STACK — `const` at top level does not land on
   window). No ES modules, no fetch() of local files, no CDN, no build step:
   every figure is inline SVG drawn from STACK, so opening index.html straight
   off the disk works with the network switched off.
   ========================================================================== */
(function () {
  'use strict';

  if (typeof STACK === 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      document.body.innerHTML =
        '<div style="font:16px system-ui;padding:40px;max-width:640px;margin:0 auto">' +
        '<h1>Stack data did not load</h1><p>assets/stack.js must load before assets/site.js. ' +
        'Check that both files sit in the <code>assets</code> folder next to this page.</p></div>';
    });
    return;
  }

  var S = STACK;
  var SEC = document.body.getAttribute('data-section') || 'index';

  /* ======================================================================
     0. Helpers
     ==================================================================== */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function el(sel, root) { return (root || document).querySelector(sel); }
  function els(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function make(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function sectionById(id) {
    for (var i = 0; i < S.sections.length; i++) if (S.sections[i].id === id) return S.sections[i];
    return null;
  }
  function recById(id) {
    for (var i = 0; i < S.recs.length; i++) if (S.recs[i].id === id) return S.recs[i];
    return null;
  }
  function groupById(id) {
    for (var i = 0; i < S.groups.length; i++) if (S.groups[i].id === id) return S.groups[i];
    return null;
  }
  function ratingById(id) {
    for (var i = 0; i < S.ratings.length; i++) if (S.ratings[i].id === id) return S.ratings[i];
    return null;
  }
  function recsIn(groupId) {
    return S.recs.filter(function (r) { return r.group === groupId; })
      .sort(function (a, b) { return a.order - b.order; });
  }
  function byOrder() { return S.recs.slice().sort(function (a, b) { return a.order - b.order; }); }
  function fitCount(fit) { return S.recs.filter(function (r) { return r.fit === fit; }).length; }

  /* a technology keeps its rating colour everywhere it appears */
  var FIT_VAR = { green: 'var(--good)', amber: 'var(--warn)', red: 'var(--risk)' };
  var FIT_SOFT = { green: 'var(--good-soft)', amber: 'var(--warn-soft)', red: 'var(--risk-soft)' };
  var FIT_ICON = { green: '🟢', amber: '🟡', red: '🔴' };
  function fitVar(f) { return FIT_VAR[f] || 'var(--slate)'; }
  function fitSoft(f) { return FIT_SOFT[f] || 'var(--slate-soft)'; }
  function fitIcon(f) { return FIT_ICON[f] || ''; }
  function fitLabel(f) { var r = ratingById(f); return r ? r.label : f; }

  function shortTech(t) {
    return String(t)
      .replace(' (TypeScript)', '').replace(' (tool use)', '')
      .replace(' (Mozilla’s PDF.js)', '').replace('The browser’s own PDF viewer, via an iframe', 'Browser PDF viewer')
      .replace('GitHub Actions scheduled workflow', 'GitHub Actions cron')
      .replace('PostgreSQL full-text search', 'Postgres FTS');
  }

  /* ======================================================================
     1. Theme
     ==================================================================== */
  var themeListeners = [];
  function currentTheme() { return document.documentElement.getAttribute('data-theme') || 'light'; }
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('pmsd-theme', t); } catch (e) {}
    var b = el('#themeBtn');
    if (b) {
      b.textContent = t === 'dark' ? '☀ Light' : '☾ Dark';
      b.setAttribute('aria-label', 'Switch to ' + (t === 'dark' ? 'light' : 'dark') + ' theme');
    }
    themeListeners.forEach(function (fn) { try { fn(t); } catch (e) {} });
  }
  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem('pmsd-theme'); } catch (e) {}
    if (!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) saved = 'dark';
    applyTheme(saved || 'light');
  }
  initTheme();

  /* ======================================================================
     2. Search index — one entry per fact, over every field of STACK
     ==================================================================== */
  var STOP = ('the a an and or of to in is it that this for on with as by be are was ' +
    'not but if at from its into than then so do does can will one all any no yes you ' +
    'your we our they them their there here what which when how why has have had').split(' ');
  var STOPSET = {};
  STOP.forEach(function (w) { STOPSET[w] = 1; });

  function tokenize(s) { return String(s || '').toLowerCase().match(/[a-z0-9]+/g) || []; }
  function stem(w) {
    return w.replace(/ies$/, 'y').replace(/(sses|shes|ches|xes)$/, 's').replace(/(ing|edly|ed|es|s)$/, '');
  }
  function stems(arr) { return arr.map(stem); }

  var INDEX = (function build() {
    var out = [];
    function add(sectionId, title, body, anchor) {
      var sec = sectionById(sectionId);
      if (!sec) return;
      var hay = (title + ' ' + body).toLowerCase();
      var bt = tokenize(body), tt = tokenize(title);
      out.push({
        section: sectionId, sectionName: sec.name, file: sec.file, num: sec.num,
        title: title, body: body, anchor: anchor || '',
        hay: hay, tokens: bt.concat(tt), stems: stems(bt.concat(tt)),
        titleTokens: tt, titleStems: stems(tt)
      });
    }

    /* 01 summary */
    S.ratings.forEach(function (r) { add('summary', r.icon + ' ' + r.label, r.means, 'key-' + r.id); });
    add('summary', 'What 🔴 does not mean', S.ratingNote, 'key');
    add('summary', 'Where this stack is most likely to break',
      S.headline.claim + ' ' + S.headline.first + ' ' + S.headline.second + ' ' + S.headline.closer, 'headline');
    S.scale.forEach(function (x, i) { add('summary', 'Sized for: ' + x.k, x.v + ' — ' + x.note, 'scale-' + i); });
    add('summary', 'Correct the sizing assumptions', S.scaleWarning, 'scale');

    /* 02 picks */
    S.groups.forEach(function (g) { add('picks', 'Group: ' + g.label, g.blurb, 'g-' + g.id); });
    S.places.forEach(function (p) { add('picks', 'Runs ' + p.label, p.note, 'g-' + p.id); });
    S.recs.forEach(function (r) {
      add('picks', r.tech + ' — ' + r.component,
        fitLabel(r.fit) + '. ' + r.why + ' ' + (r.caveat || '') +
        ' Group: ' + (groupById(r.group) || {}).label + '. Phase ' + r.phase + '.', 'r-' + r.id);
    });

    /* 03 watch-outs */
    S.recs.filter(function (r) { return r.caveat; }).forEach(function (r) {
      add('watch', 'Watch out — ' + r.tech, r.caveat + ' Rated ' + fitLabel(r.fit) + ' for ' + r.component + '.', 'w-' + r.id);
    });
    S.confidence.forEach(function (c) { add('watch', 'Least confident: ' + c.title, c.note, 'lc-' + c.recId); });

    /* 04 prompts */
    S.recs.forEach(function (r) { add('prompts', 'Prompt for ' + r.tech, r.prompt, 'p-' + r.id); });

    /* 05 learn */
    S.learn.forEach(function (l) { add('learn', 'Learn ' + l.n + ': ' + l.title, l.why + ' Build phase ' + l.phase + '.', 'l-' + l.n); });
    add('learn', 'Things you set up once, not learn', S.learnNote, 'learn-note');

    /* 06 alternatives */
    S.alternatives.forEach(function (a, i) {
      add('options', a.chosen + ' instead of ' + a.instead, a.why, 'alt-' + i);
    });

    /* 07 lock-in */
    S.lockinScale.forEach(function (l) { add('lockin', 'Undo score ' + l.n, l.label, 'ls-' + l.n); });
    S.lockinNotes.forEach(function (n) {
      var r = recById(n.recId);
      add('lockin', 'Undoing ' + (r ? r.tech : n.recId), n.note + ' Scored ' + (r ? r.lockin : '?') + ' out of 5.', 'lk-' + n.recId);
    });
    add('lockin', 'The pattern worth noticing', S.lockinPattern, 'lock-pattern');

    /* 08 appendix */
    S.cost.rows.forEach(function (c, i) {
      add('appendix', 'Cost: ' + c.item, 'Day one ' + c.day1 + ', later ' + c.later + '. ' + c.note, 'cost-' + i);
    });
    add('appendix', 'What this costs to start', S.cost.day1 + ' ' + S.cost.later + ' ' + S.cost.caveat, 'cost');
    S.buildFirst.forEach(function (b) { add('appendix', 'Build first ' + b.n + ': ' + b.what, b.why, 'bf-' + b.n); });
    S.architectureComponents.forEach(function (c, i) {
      var r = recById(c.recId);
      add('appendix', 'Coverage: ' + c.name, 'Recommended technology: ' + (r ? r.tech : '?') + '. ' + (r ? r.why : ''), 'cov-' + i);
    });
    S.notCovered.forEach(function (n, i) { add('appendix', 'Not covered: ' + n.area, n.note, 'nc-' + i); });

    return out;
  })();

  function search(q, limit) {
    var raw = tokenize(q);
    var terms = raw.filter(function (t) { return !STOPSET[t] && t.length > 1; });
    if (!terms.length) terms = raw;
    if (!terms.length) return [];
    var phrase = String(q).toLowerCase().trim();
    var scored = [];

    INDEX.forEach(function (e) {
      var s = 0, matched = 0;
      terms.forEach(function (t) {
        var tf = 0, i;
        for (i = 0; i < e.tokens.length; i++) if (e.tokens[i] === t) tf++;
        if (tf) { s += tf; matched++; }
        else {
          var st = stem(t), sc = 0;
          for (i = 0; i < e.stems.length; i++) if (e.stems[i] === st) sc++;
          if (sc) { s += sc * 0.6; matched++; }
        }
        var ttf = 0;
        for (i = 0; i < e.titleTokens.length; i++) if (e.titleTokens[i] === t) ttf++;
        if (ttf) s += ttf * 3;
        else if (e.titleStems.indexOf(stem(t)) >= 0) s += 1.8;
      });
      if (!matched) return;
      if (matched === terms.length && terms.length > 1) s += 2;
      if (phrase.length > 3 && e.hay.indexOf(phrase) >= 0) s += 5;
      scored.push({ e: e, s: s });
    });

    scored.sort(function (a, b) { return b.s - a.s; });
    return scored.slice(0, limit || 12).map(function (x) { return x.e; });
  }

  function highlight(text, q) {
    var terms = tokenize(q).filter(function (t) { return !STOPSET[t] && t.length > 1; });
    var outHtml = esc(text);
    terms.forEach(function (t) {
      var re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[a-z]{0,3})', 'ig');
      outHtml = outHtml.replace(re, '<mark>$1</mark>');
    });
    return outHtml;
  }

  function snippet(entry, q, len) {
    var terms = tokenize(q).filter(function (t) { return !STOPSET[t] && t.length > 1; });
    var body = entry.body, low = body.toLowerCase(), at = -1;
    for (var i = 0; i < terms.length && at < 0; i++) at = low.indexOf(terms[i]);
    var start = at > 60 ? at - 60 : 0;
    var text = body.slice(start, start + (len || 170));
    if (start > 0) text = '…' + text;
    if (start + (len || 170) < body.length) text += '…';
    return highlight(text, q);
  }

  /* ======================================================================
     3. Copy to clipboard — with a file:// safe fallback
     ==================================================================== */
  function flash(btn, cls, label, revert) {
    var old = btn.textContent;
    btn.classList.add(cls);
    btn.textContent = label;
    setTimeout(function () { btn.classList.remove(cls); btn.textContent = revert || old; }, 1900);
  }
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
  function copyText(text, btn) {
    var done = function () { flash(btn, 'ok', '✓ Copied', '⧉ Copy'); };
    var failed = function () {
      if (legacyCopy(text)) { done(); return; }
      flash(btn, 'fail', 'Press ⌘C', '⧉ Copy');
    };
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext !== false) {
      navigator.clipboard.writeText(text).then(done)['catch'](failed);
    } else {
      failed();
    }
  }
  function wireCopyButtons(root) {
    els('[data-copy]', root || document).forEach(function (btn) {
      if (btn.getAttribute('data-wired')) return;
      btn.setAttribute('data-wired', '1');
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        copyText(btn.getAttribute('data-copy'), btn);
      });
    });
  }

  /* ======================================================================
     4. Chrome — nav, section links, progress, breadcrumbs, pager, top
     ==================================================================== */
  function buildChrome() {
    var isIndex = SEC === 'index';
    var cur = sectionById(SEC);

    var nav = make('div', 'nav');
    nav.innerHTML =
      '<div class="nav-inner">' +
        '<a class="brand" href="index.html"><span class="dot"></span><span>' + esc(S.meta.project) +
          '<small>Tech Stack</small></span></a>' +
        (isIndex ? '' : '<a class="btn ghost sm" href="index.html">← Command Center</a>') +
        '<div class="nav-spacer"></div>' +
        '<div class="search-wrap">' +
          '<input class="search-input" id="navSearch" type="search" placeholder="Search the stack…" ' +
            'autocomplete="off" aria-label="Search the whole tech-stack knowledge base">' +
          '<div class="search-results" id="navResults" role="listbox"></div>' +
        '</div>' +
        '<button class="btn sm" id="themeBtn" type="button"></button>' +
        '<button class="btn sm" id="printBtn" type="button">⎙ Print</button>' +
      '</div>' +
      '<nav class="nav-secs" aria-label="Sections">' +
        S.sections.map(function (s) {
          return '<a href="' + s.file + '"' + (s.id === SEC ? ' class="here" aria-current="page"' : '') +
            '>' + esc(s.nav) + '</a>';
        }).join('') +
      '</nav>';

    var prog = make('div'); prog.id = 'progress';
    document.body.insertBefore(nav, document.body.firstChild);
    document.body.insertBefore(prog, document.body.firstChild);

    el('#themeBtn').addEventListener('click', function () { applyTheme(currentTheme() === 'dark' ? 'light' : 'dark'); });
    el('#printBtn').addEventListener('click', function () { window.print(); });
    applyTheme(currentTheme());

    if (!isIndex && cur) {
      var c = make('div', 'crumbs');
      c.innerHTML = '<a href="index.html">Command Center</a><span>›</span><span>' + esc(cur.num) +
        '</span><span>›</span><span>' + esc(cur.name) + '</span>';
      var wrap = el('.wrap');
      if (wrap) wrap.insertBefore(c, wrap.firstChild);
    }

    if (!isIndex && cur) {
      var i = S.sections.indexOf(cur);
      var prev = i > 0 ? S.sections[i - 1] : null;
      var next = i < S.sections.length - 1 ? S.sections[i + 1] : null;
      var p = make('nav', 'pager');
      p.setAttribute('aria-label', 'Section navigation');
      p.innerHTML =
        (prev ? '<a class="prev" href="' + prev.file + '"><div class="dir">← Previous</div><div class="nm">' + esc(prev.num + ' · ' + prev.name) + '</div></a>'
              : '<a class="prev" href="index.html"><div class="dir">←</div><div class="nm">Command Center</div></a>') +
        (next ? '<a class="next" href="' + next.file + '"><div class="dir">Next →</div><div class="nm">' + esc(next.num + ' · ' + next.name) + '</div></a>'
              : '<a class="next" href="index.html"><div class="dir">Back to</div><div class="nm">Command Center →</div></a>');
      el('.wrap').appendChild(p);
    }

    var top = make('button', 'btn', '↑ Top');
    top.id = 'toTop'; top.type = 'button';
    top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    document.body.appendChild(top);

    var f = make('div', 'foot');
    f.innerHTML = 'Generated from <code>assets/stack.js</code> — one data object, ' + S.sections.length +
      ' sections, ' + S.recs.length + ' recommendations. Saved at <code>' + esc(S.meta.docPath) + '</code>. ' +
      'Rated against the architecture at <code>' + esc(S.meta.architecturePath) + '</code>. ' +
      'No network needed: every figure is inline SVG and Ask works offline in Search mode.';
    document.body.appendChild(f);

    window.addEventListener('scroll', function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var pct = h > 0 ? (window.scrollY / h) * 100 : 0;
      prog.style.width = pct + '%';
      top.classList.toggle('show', window.scrollY > 500);
    }, { passive: true });
  }

  /* ======================================================================
     5. Nav search — narrow this page AND rank matches from every section
     ==================================================================== */
  function wireSearch() {
    var input = el('#navSearch'), box = el('#navResults');
    if (!input) return;
    var noteEl = null;

    function filterCurrentPage(q) {
      var items = els('[data-searchable]');
      if (!items.length) return 0;
      if (!q) {
        items.forEach(function (n) { n.classList.remove('hidden-by-search'); });
        if (noteEl) { noteEl.remove(); noteEl = null; }
        return items.length;
      }
      var terms = tokenize(q).filter(function (t) { return !STOPSET[t] && t.length > 1; });
      var shown = 0;
      items.forEach(function (n) {
        var hay = (n.textContent || '').toLowerCase();
        var hit = terms.length === 0 || terms.every(function (t) {
          return hay.indexOf(t) >= 0 || hay.indexOf(stem(t)) >= 0;
        });
        n.classList.toggle('hidden-by-search', !hit);
        if (hit) shown++;
      });
      var host = el('.wrap');
      if (host) {
        if (!noteEl) { noteEl = make('div', 'search-note'); host.insertBefore(noteEl, host.children[2] || null); }
        noteEl.textContent = shown === 0
          ? 'Nothing on this page matches “' + q + '”. Check the matches from other sections in the dropdown.'
          : 'Showing ' + shown + ' of ' + items.length + ' items on this page matching “' + q + '”.';
      }
      return shown;
    }

    function renderDropdown(q) {
      if (!q || q.length < 2) { box.classList.remove('open'); box.innerHTML = ''; return; }
      var hits = search(q, 14).filter(function (e) { return e.section !== SEC; });
      if (!hits.length) {
        box.innerHTML = '<div class="sr-head">Elsewhere in this stack</div>' +
          '<div class="sr-empty">No matches in other sections. If this stack truly does not cover it, ' +
          '<a href="08-appendix.html">Costs &amp; Limits</a> lists what this document deliberately does not tell you — ' +
          'a miss there is itself an answer.</div>';
        box.classList.add('open');
        return;
      }
      var html = '<div class="sr-head">' + hits.length + ' match' + (hits.length === 1 ? '' : 'es') + ' in other sections</div>';
      hits.forEach(function (e) {
        var href = e.file + '?q=' + encodeURIComponent(q) + (e.anchor ? '#' + e.anchor : '');
        html += '<a class="sr-item" href="' + href + '">' +
          '<span class="sr-title"><span>' + highlight(e.title, q) + '</span>' +
          '<span class="sr-sec">' + esc(e.num + ' ' + e.sectionName) + '</span></span>' +
          '<span class="sr-snip">' + snippet(e, q, 150) + '</span></a>';
      });
      box.innerHTML = html;
      box.classList.add('open');
    }

    var t = null;
    input.addEventListener('input', function () {
      var q = input.value.trim();
      clearTimeout(t);
      t = setTimeout(function () { filterCurrentPage(q); renderDropdown(q); }, 90);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { input.value = ''; filterCurrentPage(''); box.classList.remove('open'); input.blur(); }
      if (e.key === 'ArrowDown') {
        var first = el('.sr-item', box);
        if (first) { e.preventDefault(); first.focus(); }
      }
    });
    document.addEventListener('click', function (e) {
      if (!box.contains(e.target) && e.target !== input) box.classList.remove('open');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && document.activeElement !== input &&
          !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
        e.preventDefault(); input.focus();
      }
    });

    var qp = new URLSearchParams(window.location.search).get('q');
    if (qp) {
      input.value = qp;
      filterCurrentPage(qp);
      setTimeout(function () { highlightOnPage(qp); }, 60);
    }
  }

  function highlightOnPage(q) {
    var terms = tokenize(q).filter(function (t) { return !STOPSET[t] && t.length > 1; });
    if (!terms.length) return;
    var re = new RegExp('(' + terms.map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'ig');
    els('[data-searchable] p, [data-searchable] td, [data-searchable] li, [data-searchable] .rec-why, ' +
        '[data-searchable] .caveat, [data-searchable] .km, [data-searchable] .ptxt')
      .forEach(function (n) {
        if (n.querySelector && n.querySelector('mark')) return;
        if (!re.test(n.textContent)) { re.lastIndex = 0; return; }
        re.lastIndex = 0;
        n.innerHTML = n.innerHTML.replace(/(>|^)([^<]+)/g, function (m, pre, txt) {
          return pre + txt.replace(re, '<mark>$1</mark>');
        });
      });
    var firstMark = el('mark');
    if (firstMark && !window.location.hash) firstMark.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  /* ======================================================================
     6. Inline SVG illustrations — drawn from STACK, theme-aware, no CDN
     Rule followed throughout: never place two labels at the same
     coordinate. Every repeated element is offset by its index.
     ==================================================================== */
  function svgOpen(w, h, extra) {
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" ' +
      'role="img" font-family="Segoe UI, system-ui, sans-serif" ' + (extra || '') + '>';
  }
  function box(x, y, w, h, fill, stroke, r, dash) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (r == null ? 10 : r) +
      '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.5"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>';
  }
  function txt(x, y, s, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" fill="' + (o.fill || 'var(--ink)') + '" font-size="' + (o.size || 12) +
      '" font-weight="' + (o.weight || 500) + '" text-anchor="' + (o.anchor || 'start') + '">' + esc(s) + '</text>';
  }
  function arrowDefs(id) {
    return '<defs><marker id="' + id + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" ' +
      'orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted)"/></marker></defs>';
  }
  function line(x1, y1, x2, y2, mid) {
    return '<path d="M ' + x1 + ' ' + y1 + ' L ' + x2 + ' ' + y2 + '" stroke="var(--muted)" stroke-width="1.5" ' +
      'fill="none"' + (mid ? ' marker-end="url(#' + mid + ')"' : '') + '/>';
  }
  function clip(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function chipW(label, per, min, max) {
    return Math.max(min || 54, Math.min(max || 210, label.length * (per || 6.1) + 20));
  }

  /* -- 6a. The whole stack as bands, coloured by fit rating --------------- */
  function svgBands(compact) {
    var w = 780, pad = 12, lineH = compact ? 21 : 24, chipH = compact ? 17 : 20;
    var rows = [];
    S.groups.forEach(function (g) {
      var members = recsIn(g.id);
      var lines = [[]], x = 14;
      members.forEach(function (r) {
        var label = clip(shortTech(r.tech), compact ? 16 : 26);
        var cw = chipW(label, compact ? 5.4 : 6.1, 48, 200);
        if (x + cw > w - 20) { lines.push([]); x = 14; }
        lines[lines.length - 1].push({ r: r, label: label, x: x, w: cw });
        x += cw + 6;
      });
      rows.push({ g: g, lines: lines, n: members.length });
    });
    var h = pad;
    rows.forEach(function (row) { h += (compact ? 18 : 22) + row.lines.length * lineH + 10; });
    h += compact ? 6 : 24;

    var s = svgOpen(w, h);
    s += '<title>Every recommendation, grouped by what kind of thing it is and coloured by fit rating</title>';
    var y = pad;
    rows.forEach(function (row, gi) {
      var bandH = (compact ? 18 : 22) + row.lines.length * lineH + 4;
      s += box(8, y, w - 16, bandH, 'var(--card)', 'var(--border)', 10);
      s += '<rect x="8" y="' + y + '" width="3.5" height="' + bandH + '" fill="var(--accent)" rx="1.7"/>';
      s += txt(16, y + (compact ? 13 : 15), row.g.label.toUpperCase() + '  ·  ' + row.n,
        { size: compact ? 8.6 : 10, weight: 800, fill: 'var(--muted)' });
      row.lines.forEach(function (ln, li) {
        var ly = y + (compact ? 18 : 22) + li * lineH;
        ln.forEach(function (c) {
          s += box(c.x, ly, c.w, chipH, fitSoft(c.r.fit), fitVar(c.r.fit), 6);
          s += txt(c.x + 8, ly + chipH - (compact ? 5 : 6), c.label,
            { size: compact ? 7.8 : 9.4, weight: 700, fill: fitVar(c.r.fit) });
        });
      });
      y += bandH + 6;
      // gi kept explicit so every band is offset by its own index, never stacked
      if (gi < 0) s += '';
    });
    if (!compact) {
      var lx = 14;
      S.ratings.forEach(function (rt, i) {
        s += '<rect x="' + lx + '" y="' + (h - 17) + '" width="10" height="10" rx="3" fill="' +
          fitSoft(rt.id) + '" stroke="' + fitVar(rt.id) + '"/>';
        s += txt(lx + 15, h - 8, fitCount(rt.id) + ' ' + rt.label.toLowerCase(), { size: 9.6, fill: 'var(--muted)' });
        lx += 165 + i * 0;
      });
    }
    return s + '</svg>';
  }

  /* -- 6b. Groups as a card grid ----------------------------------------- */
  function svgGroups(compact) {
    var w = 780, cols = compact ? 3 : 3, cw = (w - 30 - (cols - 1) * 10) / cols;
    var ch = compact ? 62 : 84;
    var rows = Math.ceil(S.groups.length / cols);
    var h = rows * (ch + 10) + (compact ? 12 : 30);
    var s = svgOpen(w, h);
    s += '<title>The five groups, how many recommendations sit in each, and their fit ratings</title>';
    S.groups.forEach(function (g, i) {
      var r = Math.floor(i / cols), c = i % cols;
      var x = 15 + c * (cw + 10), y = (compact ? 6 : 22) + r * (ch + 10);
      var members = recsIn(g.id);
      s += box(x, y, cw, ch, 'var(--card)', 'var(--border)', 10);
      wrapText(g.label, Math.floor(cw / 6.4)).slice(0, 2).forEach(function (ln, j) {
        s += txt(x + 11, y + 18 + j * 12, ln, { size: compact ? 9.4 : 11, weight: 800 });
      });
      s += txt(x + cw - 11, y + 18, String(members.length), { size: compact ? 12 : 15, weight: 800, anchor: 'end', fill: 'var(--accent)' });
      // one dot per member, offset by its own index so none overlap
      members.forEach(function (m, mi) {
        var dx = x + 13 + (mi % 8) * 15, dy = y + (compact ? 40 : 50) + Math.floor(mi / 8) * 15;
        s += '<circle cx="' + dx + '" cy="' + dy + '" r="5.5" fill="' + fitSoft(m.fit) + '" stroke="' + fitVar(m.fit) + '" stroke-width="1.5"/>';
      });
      if (!compact) {
        wrapText(g.blurb, Math.floor(cw / 4.7)).slice(0, 1).forEach(function (ln, j) {
          s += txt(x + 11, y + ch - 8 + j * 10, clip(ln, 44), { size: 8.4, fill: 'var(--muted)' });
        });
      }
    });
    if (!compact) s += txt(15, 14, 'One dot per recommendation, coloured by its fit rating', { size: 9.8, fill: 'var(--muted)' });
    return s + '</svg>';
  }

  /* -- 6c. Proportional bar of the ratings, with the reds called out ------ */
  function svgRatio(compact) {
    var w = 780, h = compact ? 132 : 250, s = svgOpen(w, h) + arrowDefs('arRatio');
    s += '<title>How the seventeen recommendations split across the three fit ratings, with every red named</title>';
    var total = S.recs.length, x = 15, barY = compact ? 34 : 52, barH = compact ? 34 : 44;
    var centres = {};
    S.ratings.forEach(function (rt) {
      var n = fitCount(rt.id);
      if (!n) return;
      var bw = (w - 30) * (n / total);
      s += box(x, barY, bw - 3, barH, fitSoft(rt.id), fitVar(rt.id), 8);
      s += txt(x + 11, barY + (compact ? 15 : 19), String(n), { size: compact ? 13 : 17, weight: 800, fill: fitVar(rt.id) });
      s += txt(x + 11, barY + (compact ? 27 : 34), clip(rt.label, Math.floor(bw / 6)), { size: compact ? 8.4 : 10.5, weight: 700, fill: fitVar(rt.id) });
      centres[rt.id] = x + bw / 2;
      x += bw;
    });
    s += txt(15, compact ? 20 : 26, total + ' recommendations, rated for this project — not for popularity',
      { size: compact ? 9 : 11, weight: 650, fill: 'var(--muted)' });

    if (!compact) {
      var reds = S.recs.filter(function (r) { return r.fit === 'red'; });
      var cx = centres.red || (w - 60);
      var listY = barY + barH + 34;
      s += line(cx, barY + barH + 4, cx, listY - 12, 'arRatio');
      reds.forEach(function (r, i) {
        // each red is offset by its own index; nothing shares a coordinate
        var ry = listY + i * 42;
        s += box(w - 355, ry - 16, 340, 36, 'var(--risk-soft)', 'var(--risk)', 8);
        s += txt(w - 343, ry - 2, fitIcon('red') + '  ' + shortTech(r.tech), { size: 11.5, weight: 800, fill: 'var(--risk)' });
        s += txt(w - 343, ry + 12, clip(r.component, 52), { size: 9, fill: 'var(--muted)' });
      });
      s += txt(15, listY - 4, 'The two that deserve a decision,', { size: 11, weight: 700 });
      s += txt(15, listY + 12, 'not a default:', { size: 11, weight: 700 });
      s += txt(15, listY + 34, 'Everything else on this list', { size: 9.6, fill: 'var(--muted)' });
      s += txt(15, listY + 46, 'you can change your mind about', { size: 9.6, fill: 'var(--muted)' });
      s += txt(15, listY + 58, 'in a week or less.', { size: 9.6, fill: 'var(--muted)' });
    }
    return s + '</svg>';
  }

  /* -- 6d. Prompt cards --------------------------------------------------- */
  function svgCards(compact) {
    var w = 780, cols = compact ? 5 : 6;
    var cw = (w - 30 - (cols - 1) * 8) / cols, ch = compact ? 34 : 46;
    var rows = Math.ceil(S.recs.length / cols);
    var h = rows * (ch + 8) + (compact ? 10 : 30);
    var s = svgOpen(w, h);
    s += '<title>One copy-ready prompt per recommendation, each already naming this project</title>';
    byOrder().forEach(function (r, i) {
      var rw = Math.floor(i / cols), c = i % cols;
      var x = 15 + c * (cw + 8), y = (compact ? 4 : 22) + rw * (ch + 8);
      s += box(x, y, cw, ch, fitSoft(r.fit), fitVar(r.fit), 7);
      s += box(x + 4, y - 3, cw - 8, ch, 'var(--card)', fitVar(r.fit), 7);
      wrapText(shortTech(r.tech), Math.floor(cw / 5.2)).slice(0, compact ? 2 : 3).forEach(function (ln, j) {
        s += txt(x + 11, y + 10 + j * 11, ln, { size: compact ? 7.6 : 8.8, weight: 700, fill: fitVar(r.fit) });
      });
      if (!compact) s += txt(x + cw - 11, y + ch - 8, '⧉', { size: 11, anchor: 'end', fill: 'var(--muted)' });
    });
    if (!compact) s += txt(15, 14, S.recs.length + ' prompts — every one names the Pre-Med Study Desk, so the answer comes back concrete',
      { size: 9.8, fill: 'var(--muted)' });
    return s + '</svg>';
  }

  /* -- 6e. Learning ladder ------------------------------------------------ */
  function svgLadder(compact) {
    var n = S.learn.length, w = 780, rowH = compact ? 22 : 34;
    var h = n * rowH + (compact ? 14 : 46);
    var s = svgOpen(w, h);
    s += '<title>The order to learn these in, following the build phases rather than curiosity</title>';
    var top = compact ? 8 : 32;
    S.learn.forEach(function (l, i) {
      // rung i is offset by its own index in BOTH axes: never a shared coordinate
      var y = top + i * rowH;
      var indent = 15 + i * (compact ? 6 : 10);
      var bw = w - 30 - i * (compact ? 6 : 10);
      var lead = l.recIds.map(recById).filter(Boolean)[0];
      var tone = lead ? fitVar(lead.fit) : 'var(--accent)';
      var soft = lead ? fitSoft(lead.fit) : 'var(--accent-soft)';
      s += box(indent, y, bw, rowH - 5, soft, tone, 6);
      s += '<circle cx="' + (indent + 14) + '" cy="' + (y + (rowH - 5) / 2) + '" r="' + (compact ? 7 : 10) + '" fill="' + tone + '"/>';
      s += '<text x="' + (indent + 14) + '" y="' + (y + (rowH - 5) / 2 + (compact ? 3 : 4)) +
        '" fill="var(--card)" font-size="' + (compact ? 8 : 11) + '" font-weight="800" text-anchor="middle">' + l.n + '</text>';
      s += txt(indent + (compact ? 27 : 32), y + (rowH - 5) / 2 + (compact ? 3 : 4),
        clip(l.title, compact ? 34 : 58), { size: compact ? 8.2 : 11, weight: 750 });
      s += txt(indent + bw - 10, y + (rowH - 5) / 2 + (compact ? 3 : 4), 'Phase ' + l.phase,
        { size: compact ? 7.4 : 9.4, weight: 700, anchor: 'end', fill: 'var(--muted)' });
    });
    if (!compact) {
      s += txt(15, 18, 'Learn upward. Each rung is only useful once the one below it exists.', { size: 10.5, weight: 650, fill: 'var(--muted)' });
      s += txt(w - 15, h - 8, 'Colour = the fit rating of that rung’s lead technology', { size: 9.4, anchor: 'end', fill: 'var(--muted)' });
    }
    return s + '</svg>';
  }

  /* -- 6f. Alternatives: chosen versus rejected --------------------------- */
  function svgAlts(compact) {
    var n = S.alternatives.length, w = 780, rowH = compact ? 20 : 30;
    var h = n * rowH + (compact ? 14 : 42);
    var s = svgOpen(w, h) + arrowDefs('arAlt');
    s += '<title>What was chosen, what it beat, one row per decision</title>';
    var top = compact ? 8 : 30, cw = compact ? 200 : 290, gap = compact ? 40 : 60;
    S.alternatives.forEach(function (a, i) {
      var y = top + i * rowH;                 // offset by index
      var rec = recById(a.chosenId);
      var tone = rec ? fitVar(rec.fit) : 'var(--accent)';
      var soft = rec ? fitSoft(rec.fit) : 'var(--accent-soft)';
      s += box(15, y, cw, rowH - 5, soft, tone, 6);
      s += txt(25, y + rowH / 2 + 1, clip(a.chosen, compact ? 30 : 44), { size: compact ? 8 : 10.4, weight: 750, fill: tone });
      s += line(15 + cw + 4, y + (rowH - 5) / 2, 15 + cw + gap - 4, y + (rowH - 5) / 2, 'arAlt');
      s += box(15 + cw + gap, y, cw, rowH - 5, 'var(--card)', 'var(--border)', 6, '4 3');
      s += txt(25 + cw + gap, y + rowH / 2 + 1, clip(a.instead, compact ? 30 : 44), { size: compact ? 8 : 10.4, fill: 'var(--muted)' });
      s += txt(15 + cw * 2 + gap + 12, y + rowH / 2 + 1, '✕', { size: compact ? 9 : 11, weight: 800, fill: 'var(--risk)' });
    });
    if (!compact) {
      s += txt(15, 18, 'Chosen', { size: 10, weight: 800, fill: 'var(--accent)' });
      s += txt(15 + cw + gap, 18, 'Instead of', { size: 10, weight: 800, fill: 'var(--muted)' });
      s += txt(w - 15, h - 8, 'Colour on the left is that technology’s fit rating', { size: 9.2, anchor: 'end', fill: 'var(--muted)' });
    }
    return s + '</svg>';
  }

  /* -- 6g. Lock-in scale: one column per undo score ----------------------- */
  function svgLockin(compact) {
    var w = 780, cols = S.lockinScale.length;
    var cw = (w - 30 - (cols - 1) * 8) / cols;
    var buckets = S.lockinScale.map(function (l) {
      return S.recs.filter(function (r) { return r.lockin === l.n; })
        .sort(function (a, b) { return a.order - b.order; });
    });
    var maxN = buckets.reduce(function (m, b) { return Math.max(m, b.length); }, 0);
    var chipH = compact ? 14 : 19;
    var h = (compact ? 34 : 62) + maxN * (chipH + 4) + (compact ? 8 : 24);
    var s = svgOpen(w, h);
    s += '<title>Every decision scored one to five on how painful it would be to reverse</title>';
    var top = compact ? 24 : 54;
    S.lockinScale.forEach(function (l, ci) {
      var x = 15 + ci * (cw + 8);
      var tone = l.n >= 4 ? 'var(--risk)' : (l.n === 3 ? 'var(--warn)' : 'var(--good)');
      var soft = l.n >= 4 ? 'var(--risk-soft)' : (l.n === 3 ? 'var(--warn-soft)' : 'var(--good-soft)');
      s += box(x, top - (compact ? 18 : 26), cw, compact ? 15 : 21, soft, tone, 6);
      s += txt(x + cw / 2, top - (compact ? 7 : 11), String(l.n), { size: compact ? 9.5 : 12, weight: 800, anchor: 'middle', fill: tone });
      if (!compact) {
        wrapText(l.label, Math.floor(cw / 5.2)).slice(0, 2).forEach(function (ln, j) {
          s += txt(x + cw / 2, 20 + j * 10, ln, { size: 8.4, anchor: 'middle', fill: 'var(--muted)' });
        });
      }
      buckets[ci].forEach(function (r, ri) {
        // each technology sits at its own row within its own column
        var y = top + ri * (chipH + 4);
        s += box(x, y, cw, chipH, fitSoft(r.fit), fitVar(r.fit), 5);
        s += txt(x + 6, y + chipH - (compact ? 4 : 6), clip(shortTech(r.tech), Math.floor(cw / (compact ? 4.4 : 5.1))),
          { size: compact ? 6.8 : 8.4, weight: 700, fill: fitVar(r.fit) });
      });
    });
    if (!compact) s += txt(15, h - 7, 'Left is disposable, right is a commitment. Chip colour is still the fit rating.',
      { size: 9.4, fill: 'var(--muted)' });
    return s + '</svg>';
  }

  /* -- 6h. Coverage against the architecture ------------------------------ */
  function svgCoverage(compact) {
    var w = 780, rowH = compact ? 15 : 21;
    var comps = S.architectureComponents;
    var extras = S.recs.filter(function (r) { return r.source === 'flow'; }).sort(function (a, b) { return a.order - b.order; });
    var h = (compact ? 16 : 34) + comps.length * rowH + (compact ? 14 : 30) + extras.length * rowH + (compact ? 6 : 20);
    var s = svgOpen(w, h);
    s += '<title>Every architecture component matched to one technology, plus the seven the data flow needed</title>';
    var y = compact ? 12 : 32;
    if (!compact) s += txt(15, 20, 'From the component list — ' + comps.length + ' of ' + comps.length + ' matched',
      { size: 10, weight: 800, fill: 'var(--accent)' });
    comps.forEach(function (c, i) {
      var r = recById(c.recId);
      var ry = y + i * rowH;                   // offset by index
      s += box(15, ry, w - 30, rowH - 3, 'var(--card)', 'var(--border)', 5);
      s += txt(26, ry + rowH - (compact ? 6 : 8), '✓', { size: compact ? 8 : 10, weight: 800, fill: 'var(--good)' });
      s += txt(40, ry + rowH - (compact ? 6 : 8), clip(c.name, compact ? 30 : 42), { size: compact ? 7.6 : 9.6, weight: 650 });
      if (r) {
        s += box(w - 30 - (compact ? 150 : 230), ry + 2, compact ? 148 : 228, rowH - 7, fitSoft(r.fit), fitVar(r.fit), 4);
        s += txt(w - 24 - (compact ? 144 : 224), ry + rowH - (compact ? 7 : 9), clip(shortTech(r.tech), compact ? 26 : 40),
          { size: compact ? 7.2 : 9, weight: 700, fill: fitVar(r.fit) });
      }
    });
    y += comps.length * rowH + (compact ? 8 : 22);
    if (!compact) s += txt(15, y - 6, 'Added because the data flow needs them — ' + extras.length + ' more',
      { size: 10, weight: 800, fill: 'var(--muted)' });
    extras.forEach(function (r, i) {
      var ry = y + i * rowH;
      s += box(15, ry, w - 30, rowH - 3, 'var(--bg)', 'var(--border)', 5, '3 3');
      s += txt(26, ry + rowH - (compact ? 6 : 8), '+', { size: compact ? 8 : 11, weight: 800, fill: 'var(--muted)' });
      s += txt(40, ry + rowH - (compact ? 6 : 8), clip(r.component, compact ? 30 : 42), { size: compact ? 7.6 : 9.6, weight: 650 });
      s += box(w - 30 - (compact ? 150 : 230), ry + 2, compact ? 148 : 228, rowH - 7, fitSoft(r.fit), fitVar(r.fit), 4);
      s += txt(w - 24 - (compact ? 144 : 224), ry + rowH - (compact ? 7 : 9), clip(shortTech(r.tech), compact ? 26 : 40),
        { size: compact ? 7.2 : 9, weight: 700, fill: fitVar(r.fit) });
    });
    return s + '</svg>';
  }

  /* -- 6i. Topology: your machine versus somebody else's ------------------ */
  function svgTopology(compact) {
    var w = 780, colW = (w - 30 - 20) / 3;
    var chipH = compact ? 16 : 21;
    var buckets = S.places.map(function (p) {
      return S.recs.filter(function (r) { return r.runs === p.id; }).sort(function (a, b) { return a.order - b.order; });
    });
    var maxN = buckets.reduce(function (m, b) { return Math.max(m, b.length); }, 0);
    var h = (compact ? 30 : 58) + maxN * (chipH + 5) + (compact ? 8 : 26);
    var s = svgOpen(w, h);
    s += '<title>What runs on the student’s device, what runs on machines you rent, and what is somebody else’s service</title>';
    var top = compact ? 26 : 54;
    S.places.forEach(function (p, ci) {
      var x = 15 + ci * (colW + 10);
      var tone = ci === 0 ? 'var(--info)' : (ci === 1 ? 'var(--accent)' : 'var(--violet)');
      var soft = ci === 0 ? 'var(--info-soft)' : (ci === 1 ? 'var(--accent-soft)' : 'var(--violet-soft)');
      s += box(x, top - (compact ? 20 : 28), colW, compact ? 17 : 23, soft, tone, 7);
      s += txt(x + 9, top - (compact ? 8 : 13), clip(p.label, Math.floor(colW / 5.3)),
        { size: compact ? 8 : 9.8, weight: 800, fill: tone });
      s += txt(x + colW - 9, top - (compact ? 8 : 13), String(buckets[ci].length),
        { size: compact ? 8.4 : 10.5, weight: 800, anchor: 'end', fill: tone });
      buckets[ci].forEach(function (r, ri) {
        var y = top + ri * (chipH + 5);       // own column, own row
        s += box(x, y, colW, chipH, fitSoft(r.fit), fitVar(r.fit), 5);
        s += txt(x + 8, y + chipH - (compact ? 5 : 6.5), clip(shortTech(r.tech), Math.floor(colW / (compact ? 4.6 : 5.4))),
          { size: compact ? 7.4 : 9, weight: 700, fill: fitVar(r.fit) });
      });
      if (!compact) {
        wrapText(p.note, Math.floor(colW / 4.6)).slice(0, 2).forEach(function (ln, j) {
          s += txt(x + 2, 16 + j * 11, clip(ln, Math.floor(colW / 4.4)), { size: 8.2, fill: 'var(--muted)' });
        });
      }
    });
    if (!compact) s += txt(15, h - 7, 'Everything in the third column is rented. That column is where every lock-in risk on this list lives.',
      { size: 9.4, fill: 'var(--muted)' });
    return s + '</svg>';
  }

  function wrapText(s, per) {
    var words = String(s).split(' '), lines = [], cur = '';
    words.forEach(function (w) {
      if ((cur + ' ' + w).trim().length > per) { lines.push(cur.trim()); cur = w; }
      else cur += ' ' + w;
    });
    if (cur.trim()) lines.push(cur.trim());
    return lines.filter(function (l) { return l.length; });
  }

  var ILLUS = {
    bands: svgBands, groups: svgGroups, ratio: svgRatio, cards: svgCards,
    ladder: svgLadder, alts: svgAlts, lockin: svgLockin, coverage: svgCoverage,
    topology: svgTopology
  };

  /* ======================================================================
     7. Figures — wrapper, expand control, fullscreen viewer with zoom
     ==================================================================== */
  var figSeq = 0;
  function figure(host, title, reading, renderFn) {
    figSeq++;
    var id = 'fig' + figSeq;
    var f = make('figure', 'figure');
    f.id = id;
    f.innerHTML =
      '<div class="figure-head"><span class="ft">' + esc(title) + '</span>' +
      '<button class="btn sm" type="button" data-expand="' + id + '">⤢ Full screen</button></div>' +
      '<div class="figure-body"></div>' +
      '<div class="figure-read"><b>What it means:</b> ' + esc(reading) + '</div>';
    host.appendChild(f);
    var body = el('.figure-body', f);
    try { renderFn(body); } catch (e) {
      body.innerHTML = '<pre class="fallback">Could not draw this figure: ' + esc(e.message) + '</pre>';
    }
    el('[data-expand]', f).addEventListener('click', function () { openViewer(title, body.innerHTML, reading); });
    return f;
  }

  var viewer, stage, zoomable, zoom = 1, lastFocus = null;
  function buildViewer() {
    viewer = make('div', 'viewer');
    viewer.setAttribute('role', 'dialog');
    viewer.setAttribute('aria-modal', 'true');
    viewer.innerHTML =
      '<div class="viewer-bar">' +
        '<span class="vt" id="vTitle"></span>' +
        '<button class="btn sm" type="button" id="zOut">− Zoom out</button>' +
        '<button class="btn sm" type="button" id="zReset">Reset</button>' +
        '<button class="btn sm" type="button" id="zIn">+ Zoom in</button>' +
        '<span class="ask-note" id="zLevel">100%</span>' +
        '<button class="btn sm primary" type="button" id="vClose">✕ Close · Esc</button>' +
      '</div>' +
      '<div class="viewer-stage" id="vStage"><div class="zoomable" id="vZoom"></div></div>' +
      '<div class="viewer-foot" id="vFoot"></div>';
    document.body.appendChild(viewer);
    stage = el('#vStage', viewer); zoomable = el('#vZoom', viewer);
    el('#zIn', viewer).addEventListener('click', function () { setZoom(zoom * 1.25); });
    el('#zOut', viewer).addEventListener('click', function () { setZoom(zoom / 1.25); });
    el('#zReset', viewer).addEventListener('click', function () { setZoom(1); });
    el('#vClose', viewer).addEventListener('click', closeViewer);
    document.addEventListener('keydown', function (e) {
      if (!viewer.classList.contains('open')) return;
      if (e.key === 'Escape') closeViewer();
      if (e.key === '+' || e.key === '=') setZoom(zoom * 1.25);
      if (e.key === '-') setZoom(zoom / 1.25);
      if (e.key === '0') setZoom(1);
    });
    var down = false, sx = 0, sy = 0, sl = 0, st = 0;
    stage.addEventListener('mousedown', function (e) { down = true; sx = e.clientX; sy = e.clientY; sl = stage.scrollLeft; st = stage.scrollTop; });
    window.addEventListener('mouseup', function () { down = false; });
    stage.addEventListener('mousemove', function (e) {
      if (!down) return;
      stage.scrollLeft = sl - (e.clientX - sx);
      stage.scrollTop = st - (e.clientY - sy);
    });
  }
  function setZoom(z) {
    zoom = Math.min(6, Math.max(0.25, z));
    zoomable.style.transform = 'scale(' + zoom + ')';
    el('#zLevel', viewer).textContent = Math.round(zoom * 100) + '%';
  }
  function openViewer(title, html, reading) {
    if (!viewer) buildViewer();
    lastFocus = document.activeElement;
    el('#vTitle', viewer).textContent = title;
    el('#vFoot', viewer).innerHTML = '<b>What it means:</b> ' + esc(reading || '');
    zoomable.innerHTML = html;
    els('svg', zoomable).forEach(function (sv) { sv.style.width = 'min(1500px, 92vw)'; sv.style.height = 'auto'; });
    viewer.classList.add('open');
    setZoom(1);
    el('#vClose', viewer).focus();
  }
  function closeViewer() {
    viewer.classList.remove('open');
    zoomable.innerHTML = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ======================================================================
     8. Shared HTML fragments
     ==================================================================== */
  function fitBadge(fit) {
    return '<span class="fit-badge" data-fit="' + fit + '">' + fitIcon(fit) + ' ' + esc(fitLabel(fit)) + '</span>';
  }
  function promptBlock(r) {
    return '<div class="prompt"><div><span class="pl">Copy-ready prompt — paste into Claude</span>' +
      '<div class="ptxt">' + esc(r.prompt) + '</div></div>' +
      '<button class="btn sm copy-btn" type="button" data-copy="' + esc(r.prompt) + '">⧉ Copy</button></div>';
  }
  function caveatBlock(r) {
    if (!r.caveat) return '';
    var red = r.fit === 'red';
    return '<div class="caveat' + (red ? ' red' : '') + '"><span class="cl">' +
      (red ? fitIcon('red') + ' Consider carefully' : '⚠ Watch out for') + '</span>' + esc(r.caveat) + '</div>';
  }
  function recCard(r, opts) {
    opts = opts || {};
    var g = groupById(r.group);
    return '<div class="rec" data-fit="' + r.fit + '" data-searchable id="' + (opts.idPrefix || 'r-') + esc(r.id) + '">' +
      '<div class="rec-top"><div>' +
        '<div class="rec-comp">' + esc(r.component) + (r.flowStep ? ' · flow step ' + r.flowStep : '') + '</div>' +
        '<div class="rec-tech">' + esc(r.tech) + '</div>' +
      '</div>' + fitBadge(r.fit) + '</div>' +
      '<p class="rec-why">' + esc(r.why) + '</p>' +
      caveatBlock(r) +
      (opts.hidePrompt ? '' : promptBlock(r)) +
      '<div class="rec-meta">' +
        '<span class="pill slate">' + esc(g ? g.label : r.group) + '</span>' +
        '<span class="pill teal">phase ' + r.phase + '</span>' +
        '<span class="pill ' + (r.lockin >= 4 ? 'risk' : (r.lockin === 3 ? 'warn' : 'good')) + '">undo ' + r.lockin + '/5</span>' +
        '<span class="pill ' + (r.source === 'flow' ? 'blue' : 'slate') + '">' +
          (r.source === 'flow' ? 'from the data flow' : 'from the component list') + '</span>' +
      '</div></div>';
  }

  /* ======================================================================
     9. Ask panel — Mode 1 offline search, Mode 2 Claude with your own key
     ==================================================================== */
  var MODELS = [
    { id: 'claude-opus-5', label: 'Claude Opus 5 — most capable', effort: true },
    { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 — balanced', effort: true },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 — fastest', effort: false }
  ];

  function buildAsk(host) {
    var a = make('section', 'ask');
    a.id = 'ask';
    a.innerHTML =
      '<div class="ask-head">' +
        '<span class="at">Ask this stack</span>' +
        '<div class="ask-modes" role="group" aria-label="Answer mode">' +
          '<button type="button" id="mLocal" aria-pressed="true">Search — no key</button>' +
          '<button type="button" id="mClaude" aria-pressed="false">Claude — needs key</button>' +
        '</div>' +
        '<span class="ask-note" id="askHint">Answers from the local index. Works with the internet switched off.</span>' +
      '</div>' +
      '<div class="ask-body">' +
        '<div class="ask-cfg" id="askCfg">' +
          '<input class="ask-input" id="apiKey" type="password" placeholder="sk-ant-… your own Anthropic API key" ' +
            'style="flex:1 1 260px" autocomplete="off">' +
          '<select class="ask-input" id="model" style="flex:0 1 230px" aria-label="Model">' +
            MODELS.map(function (m) { return '<option value="' + m.id + '">' + esc(m.label) + '</option>'; }).join('') +
          '</select>' +
          '<select class="ask-input" id="scope" style="flex:0 1 200px" aria-label="Scope">' +
            '<option value="all">Scope: whole stack</option>' +
            '<option value="section">Scope: this section only</option>' +
          '</select>' +
          '<span class="ask-note" style="flex:1 1 100%">Your key is kept in this browser’s localStorage and sent only to ' +
            'api.anthropic.com. It is never written into these files.</span>' +
        '</div>' +
        '<div class="ask-row">' +
          '<input class="ask-input" id="askQ" type="text" placeholder="e.g. why is Clerk rated red?">' +
          '<button class="btn primary" type="button" id="askGo">Ask</button>' +
        '</div>' +
        '<div class="ask-out" id="askOut"></div>' +
      '</div>';
    host.appendChild(a);

    var mode = 'local';
    var qIn = el('#askQ', a), out = el('#askOut', a), cfg = el('#askCfg', a), hint = el('#askHint', a);

    try {
      var k = localStorage.getItem('pmsd-key');
      if (k) el('#apiKey', a).value = k;
      var mSaved = localStorage.getItem('pmsd-model');
      if (mSaved) el('#model', a).value = mSaved;
    } catch (e) {}

    function setMode(m) {
      mode = m;
      el('#mLocal', a).setAttribute('aria-pressed', String(m === 'local'));
      el('#mClaude', a).setAttribute('aria-pressed', String(m === 'claude'));
      cfg.classList.toggle('show', m === 'claude');
      hint.textContent = m === 'local'
        ? 'Answers from the local index. Works with the internet switched off.'
        : 'Answers only from this stack document, using your own key. Search mode is always available as a fallback.';
    }
    el('#mLocal', a).addEventListener('click', function () { setMode('local'); });
    el('#mClaude', a).addEventListener('click', function () { setMode('claude'); });

    function askLocal(q) {
      var hits = search(q, 8);
      if (!hits.length) {
        out.innerHTML = '<div class="ask-err">Nothing in this stack document matches “' + esc(q) + '”. ' +
          'That may itself be the answer — <a href="08-appendix.html">Costs &amp; Limits</a> lists what this ' +
          'document deliberately does not tell you.</div>';
        return;
      }
      out.innerHTML = '<p class="ask-note">' + hits.length + ' passage' + (hits.length === 1 ? '' : 's') +
        ' from this stack, best first:</p>' +
        hits.map(function (e) {
          var href = e.file + '?q=' + encodeURIComponent(q) + (e.anchor ? '#' + e.anchor : '');
          return '<a class="hit" href="' + href + '"><span class="h-top"><span class="h-title">' + highlight(e.title, q) +
            '</span><span class="h-sec">' + esc(e.num + ' ' + e.sectionName) + '</span></span>' +
            '<span class="h-snip">' + snippet(e, q, 240) + '</span></a>';
        }).join('');
    }

    function scopedStack() {
      if (el('#scope', a).value === 'all' || SEC === 'index') return S;
      var slim = { meta: S.meta, ratings: S.ratings, section: SEC };
      if (SEC === 'summary')  { slim.headline = S.headline; slim.scale = S.scale; slim.scaleWarning = S.scaleWarning; slim.ratingNote = S.ratingNote; }
      if (SEC === 'picks')    { slim.recs = S.recs; slim.groups = S.groups; slim.places = S.places; }
      if (SEC === 'watch')    { slim.recs = S.recs.filter(function (r) { return r.caveat; }); slim.confidence = S.confidence; }
      if (SEC === 'prompts')  { slim.prompts = S.recs.map(function (r) { return { tech: r.tech, fit: r.fit, prompt: r.prompt }; }); }
      if (SEC === 'learn')    { slim.learn = S.learn; slim.learnNote = S.learnNote; slim.recs = S.recs; }
      if (SEC === 'options')  { slim.alternatives = S.alternatives; slim.recs = S.recs; }
      if (SEC === 'lockin')   { slim.lockinScale = S.lockinScale; slim.lockinNotes = S.lockinNotes; slim.lockinPattern = S.lockinPattern;
                                slim.recs = S.recs.map(function (r) { return { tech: r.tech, fit: r.fit, lockin: r.lockin, runs: r.runs }; }); }
      if (SEC === 'appendix') { slim.cost = S.cost; slim.buildFirst = S.buildFirst; slim.notCovered = S.notCovered;
                                slim.architectureComponents = S.architectureComponents; slim.recs = S.recs; }
      return slim;
    }

    function askClaude(q) {
      var key = el('#apiKey', a).value.trim();
      var model = el('#model', a).value;
      if (!key) {
        out.innerHTML = '<div class="ask-err">No API key entered. Paste an Anthropic key above, or switch to ' +
          '<b>Search — no key</b>, which answers from the local index with no network at all.</div>';
        return;
      }
      try { localStorage.setItem('pmsd-key', key); localStorage.setItem('pmsd-model', model); } catch (e) {}

      out.innerHTML = '<p class="ask-note">Asking ' + esc(model) + '…</p>';

      var data = scopedStack();
      var system =
        'You are answering questions about one tech-stack recommendation document for a project called "' + S.meta.project + '".\n' +
        'The complete document is the JSON below. Answer ONLY from it.\n' +
        'If the JSON does not cover something, say plainly that this document does not cover it and point at the ' +
        '"notCovered" list — do not invent technologies, prices, version numbers or components that are not in the JSON.\n' +
        'NEVER talk the reader out of a 🔴 "Consider carefully" rating. Those ratings are deliberate judgements about ' +
        'this specific project. You may explain the reasoning and you may state what would have to change for the ' +
        'rating to move, but do not reassure, soften, or argue that the concern is overblown.\n' +
        'Be concise and concrete. Prefer plain English a non-technical reader can follow. Refer to technologies and ' +
        'components by the exact names used in the JSON.\n\nTECH STACK JSON:\n' + JSON.stringify(data);

      var body = {
        model: model,
        max_tokens: 16000,
        system: system,
        messages: [{ role: 'user', content: q }]
      };
      var mdef = MODELS.filter(function (m) { return m.id === model; })[0];
      if (mdef && mdef.effort) body.output_config = { effort: 'low' };

      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify(body)
      }).then(function (res) {
        return res.json().then(function (json) { return { ok: res.ok, status: res.status, json: json }; });
      }).then(function (r) {
        if (!r.ok) {
          var msg = (r.json && r.json.error && r.json.error.message) || 'Request failed.';
          var friendly = r.status === 401 ? 'That key was rejected. Check it, or use Search mode — it needs no key.'
            : r.status === 429 ? 'Rate limited. Wait a moment and try again, or use Search mode — it needs no key.'
            : r.status === 400 ? 'The request was rejected: ' + msg + ' Search mode still works with no key.'
            : 'Request failed (HTTP ' + r.status + '): ' + msg + ' Search mode still works with no key.';
          out.innerHTML = '<div class="ask-err">' + esc(friendly) + '</div>';
          return;
        }
        if (r.json.stop_reason === 'refusal') {
          out.innerHTML = '<div class="ask-err">The model declined to answer that one. Try rephrasing, or use ' +
            '<b>Search — no key</b> mode, which needs no key and works offline.</div>';
          return;
        }
        var text = (r.json.content || []).filter(function (b2) { return b2.type === 'text'; })
          .map(function (b2) { return b2.text; }).join('\n').trim();
        out.innerHTML = text
          ? '<div class="ask-answer">' + esc(text) + '</div><p class="ask-note">Answered by ' + esc(model) +
            ' from this stack document only.</p>'
          : '<div class="ask-err">The model returned nothing readable. Try again, or use Search mode — it needs no key.</div>';
      })['catch'](function (err) {
        out.innerHTML = '<div class="ask-err">Could not reach api.anthropic.com (' + esc(err.message) + '). ' +
          'You may be offline, or the browser blocked the request. <b>Search — no key</b> mode works offline ' +
          'and answers from the same data.</div>';
      });
    }

    function go() {
      var q = qIn.value.trim();
      if (!q) { qIn.focus(); return; }
      if (mode === 'local') askLocal(q); else askClaude(q);
    }
    el('#askGo', a).addEventListener('click', go);
    qIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    setMode('local');
  }

  /* ======================================================================
     10. Page renderers
     ==================================================================== */
  var PAGES = {

    index: function () {
      var hero = el('#heroStats');
      if (hero) {
        hero.innerHTML = [
          { v: S.recs.length, k: 'recommendations', c: '' },
          { v: fitCount('green'), k: 'great fit', c: 'green' },
          { v: fitCount('amber'), k: 'good fit', c: 'amber' },
          { v: fitCount('red'), k: 'consider carefully', c: 'red' },
          { v: S.architectureComponents.length, k: 'components covered', c: '' },
          { v: S.recs.filter(function (r) { return r.source === 'flow'; }).length, k: 'added by the flow', c: '' }
        ].map(function (s) {
          return '<div class="stat"><div class="v ' + s.c + '">' + s.v + '</div><div class="k">' + esc(s.k) + '</div></div>';
        }).join('');
      }
      var host = el('#tiles');
      S.sections.forEach(function (sec) {
        var a = document.createElement('a');
        a.className = 'tile';
        a.href = sec.file;
        a.setAttribute('data-searchable', '');
        var pic = ILLUS[sec.preview] ? ILLUS[sec.preview](true) : '';
        a.innerHTML =
          '<div class="tile-pic">' + pic + '</div>' +
          '<div class="tile-body">' +
            '<div class="tile-top"><span class="tile-num">' + esc(sec.num) + '</span>' +
            '<span class="tile-name">' + esc(sec.name) + '</span></div>' +
            '<div class="tile-blurb">' + esc(sec.blurb) + '</div>' +
            '<div class="tile-count">' + esc(sec.count(S)) + '</div>' +
          '</div>';
        host.appendChild(a);
      });
    },

    summary: function () {
      var host = el('#content');

      host.insertAdjacentHTML('beforeend', '<h2 id="key">What the ratings mean</h2><div class="key">' +
        S.ratings.map(function (r) {
          return '<div class="key-card" data-fit="' + r.id + '" data-searchable id="key-' + r.id + '">' +
            '<div class="kt">' + r.icon + ' ' + esc(r.label) + ' <span class="pill ' + r.id + '">' + fitCount(r.id) + '</span></div>' +
            '<p class="km">' + esc(r.means) + '</p></div>';
        }).join('') + '</div>' +
        '<div class="callout info" data-searchable><span class="lbl">Read this before you read anything else</span>' +
        '<p style="margin:0">' + esc(S.ratingNote) + '</p></div>');

      figure(host, 'The whole stack, coloured by fit',
        'Colour is the fit rating, and a technology keeps that colour on every page of this site. If a band looks green all the way across, that group needs no argument.',
        function (b) { b.innerHTML = svgBands(false); });

      host.insertAdjacentHTML('beforeend',
        '<h2 id="headline">Where this stack is most likely to break</h2>' +
        '<div class="callout risk" data-searchable><span class="lbl">' + esc(S.headline.claim) + '</span>' +
        '<p style="margin:0 0 10px"><b>First — Clerk.</b> ' + esc(S.headline.first) + '</p>' +
        '<p style="margin:0 0 10px"><b>Second — Phase 4’s upload path.</b> ' + esc(S.headline.second) + '</p>' +
        '<p style="margin:0;color:var(--muted)">' + esc(S.headline.closer) + '</p></div>');

      figure(host, 'How the seventeen split',
        'Seven greens is not generosity and two reds is not pessimism — both reds are rented services, which is the pattern worth noticing.',
        function (b) { b.innerHTML = svgRatio(false); });

      host.insertAdjacentHTML('beforeend', '<h2 id="scale">What this is sized for</h2>' +
        '<p class="lede" style="font-size:15px">' + esc(S.scaleWarning) + '</p>' +
        '<div class="table-scroll"><table><thead><tr><th style="width:26%">Question</th><th style="width:30%">Answer</th>' +
        '<th>Why it moves the ratings</th></tr></thead><tbody>' +
        S.scale.map(function (x, i) {
          return '<tr data-searchable id="scale-' + i + '"><td><b>' + esc(x.k) + '</b></td>' +
            '<td><span class="pill teal">' + esc(x.v) + '</span></td><td>' + esc(x.note) + '</td></tr>';
        }).join('') + '</tbody></table></div>');

      figure(host, 'What runs where',
        'Three columns: the student’s browser, machines you rent running your own code, and somebody else’s service. Every lock-in risk on this list lives in the third column.',
        function (b) { b.innerHTML = svgTopology(false); });
    },

    picks: function () {
      var host = el('#content');

      figure(host, 'Every recommendation, in its group',
        'Five groups. The last one — things the data flow needs — contains seven technologies your component list never named but your upload journey cannot happen without.',
        function (b) { b.innerHTML = svgGroups(false); });

      host.insertAdjacentHTML('beforeend', '<h2>At a glance, in your architecture’s own order</h2>' +
        '<div class="table-scroll"><table><thead><tr><th style="width:64px">Fit</th><th>Component</th>' +
        '<th>Technology</th><th style="width:110px">Where it came from</th></tr></thead><tbody>' +
        byOrder().map(function (r) {
          return '<tr data-searchable><td>' + fitIcon(r.fit) + '</td>' +
            '<td><b>' + esc(r.component) + '</b></td>' +
            '<td><a href="#r-' + esc(r.id) + '" style="color:' + fitVar(r.fit) + ';font-weight:700;text-decoration:none">' +
              esc(r.tech) + '</a></td>' +
            '<td><span class="pill ' + (r.source === 'flow' ? 'blue' : 'slate') + '">' +
              (r.source === 'flow' ? 'data flow' : 'component list') + '</span></td></tr>';
        }).join('') + '</tbody></table></div>');

      S.groups.forEach(function (g) {
        var members = recsIn(g.id);
        if (!members.length) return;
        host.insertAdjacentHTML('beforeend',
          '<h2 id="g-' + esc(g.id) + '">' + esc(g.label) + ' <span class="pill teal">' + members.length + '</span></h2>' +
          '<p class="lede" style="font-size:15px">' + esc(g.blurb) + '</p>');
        members.forEach(function (r) { host.insertAdjacentHTML('beforeend', recCard(r)); });
      });
    },

    watch: function () {
      var host = el('#content');

      figure(host, 'The split, with the reds named',
        'If every row came back green the ratings would carry no information. Two did not, and both are services you rent rather than code you write.',
        function (b) { b.innerHTML = svgRatio(false); });

      var reds = S.recs.filter(function (r) { return r.fit === 'red'; }).sort(function (a, b) { return a.order - b.order; });
      var ambers = S.recs.filter(function (r) { return r.fit === 'amber'; }).sort(function (a, b) { return a.order - b.order; });
      var greens = S.recs.filter(function (r) { return r.fit === 'green'; }).sort(function (a, b) { return a.order - b.order; });

      host.insertAdjacentHTML('beforeend', '<h2>🔴 Consider carefully <span class="pill risk">' + reds.length + '</span></h2>' +
        '<p class="lede" style="font-size:15px">Not bad technologies. Decisions.</p>');
      reds.forEach(function (r) {
        host.insertAdjacentHTML('beforeend', recCard(r, { idPrefix: 'w-', hidePrompt: true }));
      });

      host.insertAdjacentHTML('beforeend', '<h2>🟡 Read before you commit <span class="pill warn">' + ambers.length + '</span></h2>');
      ambers.forEach(function (r) {
        host.insertAdjacentHTML('beforeend', recCard(r, { idPrefix: 'w-', hidePrompt: true }));
      });

      host.insertAdjacentHTML('beforeend', '<h2>🟢 Nothing to watch <span class="pill good">' + greens.length + '</span></h2>' +
        '<div class="card" data-searchable><p style="margin:0">' +
        greens.map(function (r) {
          return '<span class="pill good" style="margin:0 6px 6px 0">' + esc(shortTech(r.tech)) + '</span>';
        }).join('') + '</p><p style="margin:10px 0 0;color:var(--muted);font-size:14px">' +
        'These are sized right, cost nothing meaningful at your scale, and are cheap to leave. Pick them and move on.</p></div>');

      host.insertAdjacentHTML('beforeend', '<h2>Where these ratings are least confident</h2>' +
        '<p class="lede" style="font-size:15px">A rating you cannot argue with is not worth much. Here is where to argue.</p>');
      S.confidence.forEach(function (c) {
        var r = recById(c.recId);
        host.insertAdjacentHTML('beforeend',
          '<div class="card" data-searchable id="lc-' + esc(c.recId) + '" style="border-left:4px solid ' +
            (c.direction === 'under-rated' ? 'var(--warn)' : 'var(--info)') + '">' +
          '<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap">' +
            '<b style="font-size:16.5px">' + esc(c.title) + '</b>' +
            '<span class="pill ' + (c.direction === 'under-rated' ? 'warn' : 'info') + '">' +
              (c.direction === 'under-rated' ? 'possibly under-rated' : 'least confident #' + c.rank) + '</span>' +
            (r ? '<span class="pill ' + r.fit + '">' + fitIcon(r.fit) + ' ' + esc(shortTech(r.tech)) + '</span>' : '') +
          '</div><p style="margin:9px 0 0">' + esc(c.note) + '</p></div>');
      });
    },

    prompts: function () {
      var host = el('#content');

      figure(host, 'One prompt per technology',
        'Every prompt already names the Pre-Med Study Desk, so the answer comes back about your system rather than a textbook. Card colour is still the fit rating.',
        function (b) { b.innerHTML = svgCards(false); });

      host.insertAdjacentHTML('beforeend', '<h2>Every copy-ready prompt, in one table</h2>' +
        '<div class="table-scroll"><table><thead><tr><th style="width:46px">Fit</th><th style="width:22%">Technology</th>' +
        '<th>Paste this into Claude</th><th style="width:96px"></th></tr></thead><tbody>' +
        byOrder().map(function (r) {
          return '<tr data-searchable id="p-' + esc(r.id) + '"><td>' + fitIcon(r.fit) + '</td>' +
            '<td><b style="color:' + fitVar(r.fit) + '">' + esc(r.tech) + '</b><br>' +
              '<span style="font-size:12px;color:var(--muted)">' + esc(r.component) + '</span></td>' +
            '<td class="ptxt" style="font-size:12.6px">' + esc(r.prompt) + '</td>' +
            '<td><button class="btn sm copy-btn" type="button" data-copy="' + esc(r.prompt) + '">⧉ Copy</button></td></tr>';
        }).join('') + '</tbody></table></div>');

      host.insertAdjacentHTML('beforeend',
        '<div class="callout info" data-searchable><span class="lbl">If the copy button does not work</span>' +
        '<p style="margin:0">Browsers block the clipboard on pages opened straight off the disk. This page falls back ' +
        'to an older copy method automatically; if that is blocked too, the button says <b>Press ⌘C</b> and you can ' +
        'select the text and copy it by hand.</p></div>');
    },

    learn: function () {
      var host = el('#content');

      figure(host, 'The ladder',
        'Rungs follow your build phases, not your curiosity. Rung 8 is the model call — last on purpose, exactly as your architecture ordered it.',
        function (b) { b.innerHTML = svgLadder(false); });

      S.learn.forEach(function (l) {
        var techs = l.recIds.map(recById).filter(Boolean);
        host.insertAdjacentHTML('beforeend',
          '<div class="card rung" data-searchable id="l-' + l.n + '">' +
            '<div class="num">' + l.n + '</div>' +
            '<div><div style="display:flex;gap:9px;align-items:baseline;flex-wrap:wrap">' +
              '<b style="font-size:16.5px">' + esc(l.title) + '</b>' +
              '<span class="pill slate">build phase ' + l.phase + '</span>' +
              techs.map(function (t) {
                return '<span class="pill ' + t.fit + '">' + fitIcon(t.fit) + ' ' + esc(shortTech(t.tech)) + '</span>';
              }).join('') +
            '</div><p style="margin:8px 0 0">' + esc(l.why) + '</p></div>' +
          '</div>');
      });

      host.insertAdjacentHTML('beforeend',
        '<div class="callout" data-searchable id="learn-note"><span class="lbl">Not really learned</span>' +
        '<p style="margin:0">' + esc(S.learnNote) + '</p></div>');

      host.insertAdjacentHTML('beforeend', '<h2>What to build first</h2>' +
        '<div class="table-scroll"><table><thead><tr><th style="width:40px">#</th><th>Do this</th><th>Why now</th></tr></thead><tbody>' +
        S.buildFirst.map(function (b) {
          return '<tr data-searchable id="bf-' + b.n + '"><td><b>' + b.n + '</b></td><td><b>' + esc(b.what) +
            '</b></td><td>' + esc(b.why) + '</td></tr>';
        }).join('') + '</tbody></table></div>');
    },

    options: function () {
      var host = el('#content');

      figure(host, 'Chosen, and what it beat',
        'Every pick had a runner-up. The left column keeps its fit-rating colour so you can see which winners were close calls.',
        function (b) { b.innerHTML = svgAlts(false); });

      S.alternatives.forEach(function (a, i) {
        var r = recById(a.chosenId);
        host.insertAdjacentHTML('beforeend',
          '<div class="card" data-searchable id="alt-' + i + '" style="border-left:4px solid ' +
            (r ? fitVar(r.fit) : 'var(--accent)') + '">' +
          '<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap">' +
            '<b style="font-size:16px;color:' + (r ? fitVar(r.fit) : 'var(--accent)') + '">' + esc(a.chosen) + '</b>' +
            '<span style="color:var(--muted);font-size:13px">instead of</span>' +
            '<span class="pill slate">' + esc(a.instead) + '</span>' +
            (r ? '<span class="pill ' + r.fit + '">' + fitIcon(r.fit) + ' ' + esc(fitLabel(r.fit)) + '</span>' : '') +
          '</div><p style="margin:9px 0 0">' + esc(a.why) + '</p></div>');
      });
    },

    lockin: function () {
      var host = el('#content');

      figure(host, 'How hard each one is to undo',
        'Left is disposable, right is a commitment. Everything you write sits on the left; everything you rent drifts right. Clerk is alone at 5.',
        function (b) { b.innerHTML = svgLockin(false); });

      host.insertAdjacentHTML('beforeend', '<h2>The scale</h2><div class="grid three">' +
        S.lockinScale.map(function (l) {
          var tone = l.n >= 4 ? 'risk' : (l.n === 3 ? 'warn' : 'good');
          return '<div class="card tight" data-searchable id="ls-' + l.n + '">' +
            '<span class="pill ' + tone + '">' + l.n + ' / 5</span>' +
            '<p style="margin:8px 0 0;font-size:14px"><b>' + esc(l.label) + '</b></p></div>';
        }).join('') + '</div>');

      host.insertAdjacentHTML('beforeend', '<h2>Every decision, scored</h2>');
      S.recs.slice().sort(function (a, b) { return b.lockin - a.lockin || a.order - b.order; }).forEach(function (r) {
        var note = S.lockinNotes.filter(function (n) { return n.recId === r.id; })[0];
        var scaleRow = S.lockinScale.filter(function (l) { return l.n === r.lockin; })[0];
        host.insertAdjacentHTML('beforeend',
          '<div class="card lock" data-n="' + r.lockin + '" data-searchable id="lk-' + esc(r.id) + '">' +
            '<div class="score">' + r.lockin + '</div>' +
            '<div><div style="display:flex;gap:9px;align-items:baseline;flex-wrap:wrap">' +
              '<b style="font-size:16px;color:' + fitVar(r.fit) + '">' + esc(r.tech) + '</b>' +
              '<span class="pill ' + r.fit + '">' + fitIcon(r.fit) + ' ' + esc(fitLabel(r.fit)) + '</span>' +
              '<span class="pill slate">' + esc(scaleRow ? scaleRow.label : '') + '</span>' +
            '</div><p style="margin:7px 0 0;font-size:14px">' +
              esc(note ? note.note : 'Standard swap. Your code changes in one place and nothing else notices.') +
            '</p></div></div>');
      });

      host.insertAdjacentHTML('beforeend',
        '<div class="callout risk" data-searchable id="lock-pattern"><span class="lbl">The pattern worth noticing</span>' +
        '<p style="margin:0">' + esc(S.lockinPattern) + '</p></div>');

      figure(host, 'The same picture, by where it runs',
        'This is the lock-in figure told a second way: things on the student’s device and on your own machines are cheap to change, and the rented column is where the cost of changing your mind lives.',
        function (b) { b.innerHTML = svgTopology(false); });
    },

    appendix: function () {
      var host = el('#content');

      host.insertAdjacentHTML('beforeend', '<h2 id="cost">What this costs to start</h2>' +
        '<div class="table-scroll"><table><thead><tr><th>Item</th><th style="width:90px">Day one</th>' +
        '<th style="width:130px">Once it is real</th><th>Note</th></tr></thead><tbody>' +
        S.cost.rows.map(function (c, i) {
          return '<tr data-searchable id="cost-' + i + '"><td><b>' + esc(c.item) + '</b></td>' +
            '<td><span class="pill ' + (c.day1 === '$0' ? 'good' : 'warn') + '">' + esc(c.day1) + '</span></td>' +
            '<td>' + esc(c.later) + '</td><td>' + esc(c.note) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="callout" data-searchable><span class="lbl">The number</span>' +
        '<p style="margin:0 0 8px"><b>Day one: ' + esc(S.cost.day1) + '</b></p>' +
        '<p style="margin:0 0 8px">' + esc(S.cost.later) + '</p>' +
        '<p style="margin:0;color:var(--muted);font-size:14px">' + esc(S.cost.caveat) + '</p></div>');

      figure(host, 'Coverage against the architecture',
        'Every component in architecture.md has exactly one row here — nothing was skipped. The dashed rows underneath are what the data flow demanded but the component list never named.',
        function (b) { b.innerHTML = svgCoverage(false); });

      host.insertAdjacentHTML('beforeend', '<h2>Component-by-component coverage</h2>' +
        '<div class="table-scroll"><table><thead><tr><th style="width:44px"></th><th>Architecture component</th>' +
        '<th>Recommended technology</th><th style="width:64px">Fit</th></tr></thead><tbody>' +
        S.architectureComponents.map(function (c, i) {
          var r = recById(c.recId);
          return '<tr data-searchable id="cov-' + i + '"><td style="color:var(--good);font-weight:800">✓</td>' +
            '<td><b>' + esc(c.name) + '</b></td>' +
            '<td><a href="02-picks.html#r-' + esc(c.recId) + '" style="color:' + (r ? fitVar(r.fit) : 'var(--ink)') +
              ';font-weight:700;text-decoration:none">' + esc(r ? r.tech : '—') + '</a></td>' +
            '<td>' + (r ? fitIcon(r.fit) : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>');

      host.insertAdjacentHTML('beforeend', '<h2>What this document does not tell you</h2>' +
        '<p class="lede" style="font-size:15px">Named honestly, so nothing here reads as covered when it is not.</p>' +
        '<div class="table-scroll"><table><thead><tr><th style="width:34%">Not covered</th><th>Why, and where the answer is</th></tr></thead><tbody>' +
        S.notCovered.map(function (n, i) {
          return '<tr data-searchable id="nc-' + i + '"><td><b>' + esc(n.area) + '</b></td><td>' + esc(n.note) + '</td></tr>';
        }).join('') + '</tbody></table></div>');

      host.insertAdjacentHTML('beforeend',
        '<div class="callout risk" data-searchable><span class="lbl">The gap most likely to matter</span>' +
        '<p style="margin:0">This document picks technologies. It does not answer your architecture’s own open ' +
        'question — <b>is a student here on their own, or is a school putting them here?</b> That question decides ' +
        'the Clerk row, and the Clerk row is the hardest one on this list to change your mind about. Answer it before ' +
        'Phase 3, not during it.</p></div>');
    }
  };

  /* ======================================================================
     11. Boot
     ==================================================================== */
  function boot() {
    buildChrome();
    if (PAGES[SEC]) PAGES[SEC]();
    var askHost = el('#askHost');
    if (askHost) buildAsk(askHost);
    wireCopyButtons(document);
    wireSearch();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();