/* ============================================================================
   site.js — shared rendering, navigation, search, figures and the Ask agent.

   Classic script. Reads the bare global lexical binding BLUEPRINT defined in
   assets/blueprint.js (NOT window.BLUEPRINT — `const` at top level does not
   land on window). No ES modules and no fetch() of local files, so this runs
   from a file:// URL with no server and no build step.
   ========================================================================== */
(function () {
  'use strict';

  if (typeof BLUEPRINT === 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      document.body.innerHTML =
        '<div style="font:16px system-ui;padding:40px;max-width:640px;margin:0 auto">' +
        '<h1>Blueprint data did not load</h1><p>assets/blueprint.js must load before assets/site.js. ' +
        'Check that both files sit in the <code>assets</code> folder next to this page.</p></div>';
    });
    return;
  }

  var B = BLUEPRINT;
  var SEC = document.body.getAttribute('data-section') || 'index';

  /* ======================================================================
     0. Small helpers
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
    for (var i = 0; i < B.sections.length; i++) if (B.sections[i].id === id) return B.sections[i];
    return null;
  }
  function compById(id) {
    for (var i = 0; i < B.components.length; i++) if (B.components[i].id === id) return B.components[i];
    return null;
  }
  var LAYER_COLOR = { Screens: 'info', Services: 'accent', Stores: 'slate', Rented: 'violet' };
  function layerVar(layer) { return 'var(--' + (LAYER_COLOR[layer] || 'slate') + ')'; }
  function layerSoft(layer) {
    var c = LAYER_COLOR[layer] || 'slate';
    return c === 'accent' ? 'var(--accent-soft)' : 'var(--' + c + '-soft)';
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
     2. Search index — one entry per fact, tagged with its section
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
      var s = sectionById(sectionId);
      if (!s) return;
      var hay = (title + ' ' + body).toLowerCase();
      var bt = tokenize(body), tt = tokenize(title);
      out.push({
        section: sectionId, sectionName: s.name, file: s.file, num: s.num,
        title: title, body: body, anchor: anchor || '',
        hay: hay, tokens: bt.concat(tt), stems: stems(bt.concat(tt)),
        titleTokens: tt, titleStems: stems(tt)
      });
    }

    add('summary', 'The idea, as written', B.idea.paragraph, 'idea');
    add('summary', 'What it actually asks for', B.idea.restated, 'idea');
    add('summary', 'The organising decision', B.idea.thesis + ' ' + B.idea.thesisWhy, 'thesis');
    B.idea.audiences.forEach(function (a, i) { add('summary', 'Audience: ' + a.name, a.note, 'aud-' + i); });
    B.idea.contentTypes.forEach(function (c, i) { add('summary', 'Content type: ' + c.name, c.example + '. ' + c.nature, 'ct-' + i); });
    B.kpis.forEach(function (k, i) { add('summary', 'Target: ' + k.name, k.target + ' — ' + k.note, 'kpi-' + i); });
    B.artifacts.forEach(function (a, i) { add('summary', 'Artifact: ' + a.name, a.what + ' (' + a.path + ')', 'art-' + i); });

    B.components.forEach(function (c) {
      add('components', c.name, c.does + ' Required by ' + c.required + '. Layer: ' + c.layer + '. Built in phase ' + c.phase + '.', 'c-' + c.id);
    });
    add('components', 'Why there is an AI layer at all', B.aiRationale.claim + ' ' + B.aiRationale.detail + ' ' + B.aiRationale.guardrail, 'ai-why');
    B.deferred.forEach(function (d) { add('components', 'Deferred: ' + d.name, d.why + ' Build it when: ' + d.trigger, 'd-' + d.id); });

    add('architecture', B.diagrams.architecture.title, B.diagrams.architecture.reading + ' ' + B.diagrams.architecture.src.replace(/[|\[\](){}<>"-]+/g, ' '), 'arch');

    B.flow.forEach(function (f) {
      add('flow', 'Step ' + f.n + ': ' + f.title, f.body + ' Carries: ' + f.payload + '. Actor: ' + f.actor + '.', 'f-' + f.n);
    });
    add('flow', B.diagrams.sequence.title, B.diagrams.sequence.reading, 'seq');

    B.phases.forEach(function (p) {
      var names = p.builds.map(function (id) { var c = compById(id); return c ? c.name : id; }).join(', ');
      add('build', 'Phase ' + p.id + ': ' + p.name, 'Proves: ' + p.proves + ' ' + p.why + ' Builds: ' + names + '.', 'p-' + p.id);
    });

    B.assumptions.forEach(function (a) {
      add('assumptions', 'Assumption ' + a.id, a.text + ' Impact if wrong: ' + a.impact, 'a-' + a.id);
    });
    add('assumptions', 'The question that would most change the design', B.openQuestion.question + ' ' + B.openQuestion.note + ' ' +
      B.openQuestion.branches.map(function (br) { return br.label + ': ' + br.consequences.join('; '); }).join(' '), 'fork');

    B.coverage.forEach(function (c, i) {
      var lbl = c.status === 'in' ? 'Covered' : (c.status === 'deferred' ? 'Deferred' : 'Not covered');
      add('coverage', lbl + ': ' + c.area, c.note, 'cov-' + i);
    });

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
      if (matched === terms.length && terms.length > 1) s += 2;         // all terms present
      if (phrase.length > 3 && e.hay.indexOf(phrase) >= 0) s += 5;      // whole-phrase bonus
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
     3. Chrome — nav, progress, back-to-top, breadcrumbs, pager
     ==================================================================== */
  function buildChrome() {
    var isIndex = SEC === 'index';
    var cur = sectionById(SEC);

    var nav = make('div', 'nav');
    nav.innerHTML =
      '<div class="nav-inner">' +
        '<a class="brand" href="index.html"><span class="dot"></span><span>' + esc(B.meta.project) +
          '<small>Blueprint</small></span></a>' +
        (isIndex ? '' : '<a class="btn ghost sm" href="index.html">← Command Center</a>') +
        '<div class="nav-spacer"></div>' +
        '<div class="search-wrap">' +
          '<input class="search-input" id="navSearch" type="search" placeholder="Search the blueprint…" ' +
            'autocomplete="off" aria-label="Search the whole blueprint">' +
          '<div class="search-results" id="navResults" role="listbox"></div>' +
        '</div>' +
        '<button class="btn sm" id="themeBtn" type="button"></button>' +
        '<button class="btn sm" id="printBtn" type="button">⎙ Print</button>' +
      '</div>';

    var prog = make('div'); prog.id = 'progress';
    document.body.insertBefore(nav, document.body.firstChild);
    document.body.insertBefore(prog, document.body.firstChild);

    el('#themeBtn').addEventListener('click', function () { applyTheme(currentTheme() === 'dark' ? 'light' : 'dark'); });
    el('#printBtn').addEventListener('click', function () { window.print(); });
    applyTheme(currentTheme());

    // breadcrumbs
    if (!isIndex && cur) {
      var c = make('div', 'crumbs');
      c.innerHTML = '<a href="index.html">Command Center</a><span>›</span><span>' + esc(cur.num) +
        '</span><span>›</span><span>' + esc(cur.name) + '</span>';
      var wrap = el('.wrap');
      if (wrap) wrap.insertBefore(c, wrap.firstChild);
    }

    // pager
    if (!isIndex && cur) {
      var i = B.sections.indexOf(cur);
      var prev = i > 0 ? B.sections[i - 1] : null;
      var next = i < B.sections.length - 1 ? B.sections[i + 1] : null;
      var p = make('nav', 'pager');
      p.setAttribute('aria-label', 'Section navigation');
      p.innerHTML =
        (prev ? '<a class="prev" href="' + prev.file + '"><div class="dir">← Previous</div><div class="nm">' + esc(prev.num + ' · ' + prev.name) + '</div></a>'
              : '<a class="prev" href="index.html"><div class="dir">←</div><div class="nm">Command Center</div></a>') +
        (next ? '<a class="next" href="' + next.file + '"><div class="dir">Next →</div><div class="nm">' + esc(next.num + ' · ' + next.name) + '</div></a>'
              : '<a class="next" href="index.html"><div class="dir">Back to</div><div class="nm">Command Center →</div></a>');
      el('.wrap').appendChild(p);
    }

    // back to top
    var top = make('button', 'btn', '↑ Top');
    top.id = 'toTop'; top.type = 'button';
    top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    document.body.appendChild(top);

    // footer
    var f = make('div', 'foot');
    f.innerHTML = 'Generated from <code>assets/blueprint.js</code> — one data object, ' +
      B.sections.length + ' sections. Design saved at <code>' + esc(B.meta.architecturePath) + '</code>. ' +
      'Ask works offline in Search mode.';
    document.body.appendChild(f);

    window.addEventListener('scroll', function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var pct = h > 0 ? (window.scrollY / h) * 100 : 0;
      prog.style.width = pct + '%';
      top.classList.toggle('show', window.scrollY > 500);
    }, { passive: true });
  }

  /* ======================================================================
     4. Nav search behaviour — narrow this page AND look across the rest
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
        box.innerHTML = '<div class="sr-head">Elsewhere in the blueprint</div>' +
          '<div class="sr-empty">No matches in other sections. If the blueprint truly does not cover this, ' +
          '<a href="07-coverage.html">Coverage</a> says so explicitly — a miss there is itself an answer.</div>';
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
      if (e.key === '/' && document.activeElement !== input && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
        e.preventDefault(); input.focus();
      }
    });

    // arriving from another page with ?q= — prefill, filter and highlight
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
    els('[data-searchable] p, [data-searchable] td, [data-searchable] li, [data-searchable] .comp-does, [data-searchable] .comp-req')
      .forEach(function (n) {
        if (n.querySelector('mark')) return;
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
     5. Inline SVG illustrations — drawn from BLUEPRINT, theme-aware
     ==================================================================== */
  function svgOpen(w, h, extra) {
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" ' +
      'role="img" font-family="Segoe UI, system-ui, sans-serif" ' + (extra || '') + '>';
  }
  function box(x, y, w, h, fill, stroke, r) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (r == null ? 10 : r) +
      '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.5"/>';
  }
  function txt(x, y, s, opts) {
    opts = opts || {};
    return '<text x="' + x + '" y="' + y + '" fill="' + (opts.fill || 'var(--ink)') + '" font-size="' + (opts.size || 12) +
      '" font-weight="' + (opts.weight || 500) + '" text-anchor="' + (opts.anchor || 'start') + '">' + esc(s) + '</text>';
  }
  function arrowDefs(id) {
    return '<defs><marker id="' + id + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted)"/></marker></defs>';
  }
  function line(x1, y1, x2, y2, mid) {
    return '<path d="M ' + x1 + ' ' + y1 + ' L ' + x2 + ' ' + y2 + '" stroke="var(--muted)" stroke-width="1.6" ' +
      'fill="none" marker-end="url(#' + mid + ')"/>';
  }
  function wrapText(s, per) {
    var words = String(s).split(' '), lines = [], cur = '';
    words.forEach(function (w) {
      if ((cur + ' ' + w).trim().length > per) { lines.push(cur.trim()); cur = w; }
      else cur += ' ' + w;
    });
    if (cur.trim()) lines.push(cur.trim());
    return lines;
  }

  /* -- 5a. The idea as inputs → the Spine → one output -------------------- */
  function svgPipeline(compact) {
    var w = 780, h = compact ? 210 : 250, s = svgOpen(w, h) + arrowDefs('ar1');
    s += '<title>Three content types filed through one shared vocabulary into one organised page</title>';
    var top = compact ? 22 : 34;
    B.idea.contentTypes.forEach(function (ct, i) {
      var y = top + i * (compact ? 58 : 64);
      s += box(14, y, 210, compact ? 46 : 50, 'var(--' + ct.color + '-soft, var(--accent-soft))', 'var(--' + ct.color + ', var(--accent))');
      s += txt(28, y + 21, ct.name, { size: 13, weight: 700 });
      s += txt(28, y + (compact ? 38 : 39), ct.example, { size: 10.5, fill: 'var(--muted)' });
      s += line(228, y + 25, 296, h / 2, 'ar1');
    });
    s += box(300, top + 6, 168, h - top * 2 + 20, 'var(--accent-soft)', 'var(--accent)', 12);
    s += txt(384, h / 2 - 14, 'The Spine', { size: 15, weight: 800, anchor: 'middle' });
    s += txt(384, h / 2 + 6, 'body system · discipline', { size: 10.5, anchor: 'middle', fill: 'var(--muted)' });
    s += txt(384, h / 2 + 21, '· level', { size: 10.5, anchor: 'middle', fill: 'var(--muted)' });
    s += txt(384, h / 2 + 44, 'nothing saves untagged', { size: 10, anchor: 'middle', fill: 'var(--accent)', weight: 700 });
    s += line(472, h / 2, 540, h / 2, 'ar1');
    s += box(546, top + 14, 218, h - top * 2 + 4, 'var(--card)', 'var(--border)', 12);
    s += txt(560, top + 40, 'One organised page', { size: 13, weight: 700 });
    ['Topic you are studying', 'A live opportunity in it', 'Your own PDF on it'].forEach(function (l, i) {
      var yy = top + 62 + i * 24;
      s += '<circle cx="566" cy="' + (yy - 4) + '" r="3.5" fill="var(--accent)"/>';
      s += txt(578, yy, l, { size: 11, fill: 'var(--muted)' });
    });
    return s + '</svg>';
  }

  /* -- 5b. Components grouped into layers, real names placed in them ------ */
  function svgLayers(compact) {
    var w = 780, rowH = compact ? 52 : 62, pad = 14;
    var h = B.layers.length * rowH + pad * 2 + (compact ? 0 : 14);
    var s = svgOpen(w, h);
    s += '<title>Every component grouped into the layer it belongs to</title>';
    B.layers.forEach(function (L, i) {
      var y = pad + i * rowH;
      var members = B.components.filter(function (c) { return c.layer === L.id; });
      s += box(10, y, w - 20, rowH - 8, 'var(--card)', 'var(--border)', 10);
      s += '<rect x="10" y="' + y + '" width="4" height="' + (rowH - 8) + '" fill="' + layerVar(L.id) + '"/>';
      s += txt(24, y + 20, L.label, { size: 11, weight: 700, fill: 'var(--muted)' });
      var x = 24;
      members.forEach(function (c) {
        var label = c.name.replace(' — the Spine', '');
        var cw = Math.min(230, label.length * 6.4 + 20);
        if (x + cw > w - 26) return;
        s += box(x, y + 28, cw, 22, layerSoft(c.layer), layerVar(c.layer), 7);
        s += txt(x + 10, y + 43, label, { size: 10.5, weight: 650 });
        if (c.guarantor) s += '<circle cx="' + (x + cw - 8) + '" cy="' + (y + 33) + '" r="3.5" fill="var(--accent)"/>';
        x += cw + 8;
      });
    });
    if (!compact) s += txt(14, h - 4, '● marks the component that guarantees the day-one requirement', { size: 10, fill: 'var(--accent)' });
    return s + '</svg>';
  }

  /* -- 5c. Miniature node graph ------------------------------------------ */
  function svgNodeGraph(compact) {
    var w = 780, h = compact ? 200 : 260, s = svgOpen(w, h) + arrowDefs('ar3');
    s += '<title>Miniature map of how the components connect</title>';
    var P = {
      webapp:  [90,  compact ? 40 : 52], console: [90, compact ? 150 : 196],
      api:     [330, compact ? 96 : 124], spine: [520, compact ? 40 : 52],
      db:      [660, compact ? 96 : 124], materials: [660, compact ? 26 : 34],
      filing:  [520, compact ? 152 : 198], claude: [672, compact ? 172 : 224],
      freshness: [330, compact ? 176 : 230], accounts: [200, compact ? 176 : 230]
    };
    var LINKS = [['webapp','api'],['console','api'],['api','spine'],['api','db'],['api','materials'],
                 ['api','filing'],['filing','claude'],['freshness','db'],['freshness','spine'],
                 ['webapp','accounts'],['console','accounts']];
    LINKS.forEach(function (L) {
      var a = P[L[0]], b = P[L[1]];
      if (a && b) s += line(a[0], a[1], b[0], b[1], 'ar3');
    });
    B.components.forEach(function (c) {
      var p = P[c.id];
      if (!p) return;
      var label = c.name.replace(' — the Spine', '').replace('Opportunity ', '').replace('Anthropic ', '');
      var bw = Math.min(150, label.length * 5.6 + 16), bh = 22;
      s += box(p[0] - bw / 2, p[1] - bh / 2, bw, bh, layerSoft(c.layer), layerVar(c.layer), c.kind === 'third-party' ? 11 : 6);
      s += txt(p[0], p[1] + 4, label, { size: 9.5, weight: 650, anchor: 'middle' });
      if (c.guarantor) s += '<rect x="' + (p[0] - bw / 2 - 4) + '" y="' + (p[1] - bh / 2 - 4) + '" width="' + (bw + 8) +
        '" height="' + (bh + 8) + '" rx="9" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="3 3"/>';
    });
    return s + '</svg>';
  }

  /* -- 5d. Flow as a numbered ribbon, coloured where the model is used ---- */
  function svgRibbon(compact) {
    var n = B.flow.length, w = 780, h = compact ? 150 : 200;
    var s = svgOpen(w, h) + arrowDefs('ar4');
    s += '<title>The six steps of one upload, coloured where the model is involved</title>';
    var bw = (w - 30) / n - 8, y = compact ? 34 : 52;
    B.flow.forEach(function (f, i) {
      var x = 15 + i * (bw + 8);
      var fill = f.touchesModel ? 'var(--violet-soft)' : 'var(--accent-soft)';
      var stroke = f.touchesModel ? 'var(--violet)' : 'var(--accent)';
      s += box(x, y, bw, compact ? 74 : 96, fill, stroke, 10);
      s += '<circle cx="' + (x + 17) + '" cy="' + (y + 18) + '" r="11" fill="' + stroke + '"/>';
      s += '<text x="' + (x + 17) + '" y="' + (y + 22) + '" fill="var(--card)" font-size="11" font-weight="800" text-anchor="middle">' + f.n + '</text>';
      wrapText(f.title, 17).slice(0, compact ? 2 : 3).forEach(function (ln, j) {
        s += txt(x + 8, y + 44 + j * 13, ln, { size: 9.6, weight: 650 });
      });
      if (!compact) {
        wrapText(f.payload, 20).slice(0, 2).forEach(function (ln, j) {
          s += txt(x + 8, y + 84 + j * 11, ln, { size: 8.4, fill: 'var(--muted)' });
        });
      }
      if (i < n - 1) s += line(x + bw + 1, y + (compact ? 37 : 48), x + bw + 6, y + (compact ? 37 : 48), 'ar4');
    });
    if (!compact) {
      s += '<rect x="15" y="' + (h - 22) + '" width="11" height="11" rx="3" fill="var(--violet-soft)" stroke="var(--violet)"/>';
      s += txt(32, h - 13, 'steps where the model is involved', { size: 10, fill: 'var(--muted)' });
      s += '<rect x="235" y="' + (h - 22) + '" width="11" height="11" rx="3" fill="var(--accent-soft)" stroke="var(--accent)"/>';
      s += txt(252, h - 13, 'steps that work with no model at all', { size: 10, fill: 'var(--muted)' });
    }
    return s + '</svg>';
  }

  /* -- 5e. Phases as a proportional timeline ----------------------------- */
  function svgTimeline(compact) {
    var w = 780, h = compact ? 150 : 210, s = svgOpen(w, h);
    s += '<title>Build phases sized in proportion, with the make-or-break phase highlighted</title>';
    var total = B.phases.reduce(function (a, p) { return a + p.weight; }, 0);
    var x = 15, barY = compact ? 44 : 60, barH = compact ? 42 : 54;
    B.phases.forEach(function (p) {
      var bw = (w - 30) * (p.weight / total) - 6;
      var fill = p.makeOrBreak ? 'var(--accent-soft)' : 'var(--card)';
      var stroke = p.makeOrBreak ? 'var(--accent)' : 'var(--border)';
      s += box(x, barY, bw, barH, fill, stroke, 9);
      if (p.makeOrBreak) s += '<rect x="' + x + '" y="' + barY + '" width="' + bw + '" height="3" rx="1.5" fill="var(--accent)"/>';
      s += txt(x + 10, barY + 20, 'Phase ' + p.id, { size: 10.5, weight: 800, fill: p.makeOrBreak ? 'var(--accent)' : 'var(--muted)' });
      wrapText(p.name, Math.max(12, Math.floor(bw / 6))).slice(0, 2).forEach(function (ln, j) {
        s += txt(x + 10, barY + 36 + j * 12, ln, { size: 10, weight: 650 });
      });
      if (!compact) {
        wrapText('Proves: ' + p.proves, Math.max(14, Math.floor(bw / 4.6))).slice(0, 4).forEach(function (ln, j) {
          s += txt(x + 10, barY + barH + 18 + j * 12, ln, { size: 9.2, fill: 'var(--muted)' });
        });
      }
      x += bw + 6;
    });
    if (p_makeOrBreakLabel()) s += txt(15, 22, p_makeOrBreakLabel(), { size: 11, weight: 700, fill: 'var(--accent)' });
    s += txt(w - 15, 22, 'width = relative size, not a delivery date', { size: 9.6, fill: 'var(--muted)', anchor: 'end' });
    return s + '</svg>';
  }
  function p_makeOrBreakLabel() {
    var mb = B.phases.filter(function (p) { return p.makeOrBreak; })[0];
    return mb ? 'Make or break: Phase ' + mb.id + ' — ' + mb.name : '';
  }

  /* -- 5f. The open question as a two-branch fork ------------------------ */
  function svgFork(compact) {
    var w = 780, h = compact ? 200 : 300, s = svgOpen(w, h) + arrowDefs('ar6');
    s += '<title>The one question that would change the design, and what follows from each answer</title>';
    var q = B.openQuestion;
    s += box(15, compact ? 60 : 104, 216, compact ? 70 : 84, 'var(--warn-soft)', 'var(--warn)', 10);
    wrapText(q.question, 26).slice(0, compact ? 3 : 4).forEach(function (ln, i) {
      s += txt(27, (compact ? 84 : 130) + i * 14, ln, { size: 11, weight: 700 });
    });
    q.branches.forEach(function (br, bi) {
      var y = bi === 0 ? (compact ? 16 : 22) : (compact ? 112 : 170);
      var tone = br.tone === 'good' ? 'good' : 'warn';
      s += line(233, compact ? 95 : 146, 286, y + (compact ? 34 : 52), 'ar6');
      var bh = compact ? 76 : 108;
      s += box(292, y, w - 310, bh, 'var(--' + tone + '-soft)', 'var(--' + tone + ')', 10);
      s += txt(306, y + 20, br.label, { size: 12, weight: 800 });
      br.consequences.slice(0, compact ? 2 : 4).forEach(function (c, i) {
        s += '<circle cx="310" cy="' + (y + 34 + i * 17) + '" r="2.6" fill="var(--' + tone + ')"/>';
        s += txt(320, y + 38 + i * 17, c.length > 62 ? c.slice(0, 60) + '…' : c, { size: 9.8, fill: 'var(--ink)' });
      });
    });
    return s + '</svg>';
  }

  /* -- 5g. Coverage as a conditional-formatted grid ---------------------- */
  function svgGrid(compact) {
    var cols = compact ? 5 : 5, cw = 148, ch = compact ? 40 : 56, gap = 6;
    var rows = Math.ceil(B.coverage.length / cols);
    var w = 780, h = rows * (ch + gap) + (compact ? 26 : 44);
    var s = svgOpen(w, h);
    s += '<title>Coverage grid: covered, deferred and not covered</title>';
    var tone = { 'in': 'good', 'deferred': 'warn', 'out': 'slate' };
    B.coverage.forEach(function (c, i) {
      var r = Math.floor(i / cols), col = i % cols;
      var x = 15 + col * (cw + gap), y = (compact ? 14 : 30) + r * (ch + gap);
      var t = tone[c.status] || 'slate';
      s += box(x, y, cw, ch, 'var(--' + t + '-soft)', 'var(--' + t + ')', 7);
      wrapText(c.area, 22).slice(0, compact ? 2 : 3).forEach(function (ln, j) {
        s += txt(x + 8, y + 16 + j * 11.5, ln, { size: 8.6, weight: 600 });
      });
    });
    if (!compact) {
      var counts = { 'in': 0, 'deferred': 0, 'out': 0 };
      B.coverage.forEach(function (c) { counts[c.status] = (counts[c.status] || 0) + 1; });
      var lx = 15;
      [['in', 'covered'], ['deferred', 'deferred'], ['out', 'not covered']].forEach(function (pair) {
        s += '<rect x="' + lx + '" y="10" width="10" height="10" rx="3" fill="var(--' + tone[pair[0]] + '-soft)" stroke="var(--' + tone[pair[0]] + ')"/>';
        s += txt(lx + 15, 19, counts[pair[0]] + ' ' + pair[1], { size: 10, fill: 'var(--muted)' });
        lx += 130;
      });
    }
    return s + '</svg>';
  }

  var ILLUS = {
    pipeline: svgPipeline, layers: svgLayers, nodegraph: svgNodeGraph,
    ribbon: svgRibbon, timeline: svgTimeline, fork: svgFork, grid: svgGrid
  };

  /* ======================================================================
     6. Figures — wrapper, expand control, fullscreen viewer with zoom
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
    // drag to pan
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
    els('svg', zoomable).forEach(function (s) { s.style.width = 'min(1500px, 92vw)'; s.style.height = 'auto'; });
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
     7. Mermaid + Chart.js (CDN; degrade gracefully when offline)
     ==================================================================== */
  var mermaidFigures = [];
  function renderMermaid(host, src) {
    if (typeof window.mermaid === 'undefined') {
      host.innerHTML = '<pre class="fallback">' + esc(src) + '</pre>' +
        '<p class="ask-note" style="text-align:left;margin-top:10px">Mermaid could not load — it comes from a CDN and needs a ' +
        'connection on first load. The diagram source is printed above and is still readable.</p>';
      return;
    }
    var id = 'mmd' + (++figSeq) + '-' + Math.floor(performance.now());
    try {
      window.mermaid.render(id, src).then(function (res) {
        host.innerHTML = res.svg;
        mermaidFigures.push({ host: host, src: src });
      }).catch(function (err) {
        host.innerHTML = '<pre class="fallback">' + esc(src) + '</pre>' +
          '<p class="ask-note">Diagram failed to draw: ' + esc(err && err.message) + '</p>';
      });
    } catch (err) {
      host.innerHTML = '<pre class="fallback">' + esc(src) + '</pre>';
    }
  }
  function initMermaid() {
    if (typeof window.mermaid === 'undefined') return;
    window.mermaid.initialize({
      startOnLoad: false,
      theme: currentTheme() === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      flowchart: { curve: 'basis', useMaxWidth: true },
      sequence: { useMaxWidth: true, actorMargin: 42 },
      gantt: { useMaxWidth: true }
    });
  }
  themeListeners.push(function () {
    if (typeof window.mermaid === 'undefined' || !mermaidFigures.length) return;
    initMermaid();
    var copy = mermaidFigures.slice();
    mermaidFigures = [];
    copy.forEach(function (f) { renderMermaid(f.host, f.src); });
  });

  var charts = [];
  function chartColors() {
    var cs = getComputedStyle(document.documentElement);
    return {
      ink: cs.getPropertyValue('--ink').trim(),
      muted: cs.getPropertyValue('--muted').trim(),
      border: cs.getPropertyValue('--border').trim(),
      good: cs.getPropertyValue('--good').trim(),
      warn: cs.getPropertyValue('--warn').trim(),
      slate: cs.getPropertyValue('--slate').trim(),
      accent: cs.getPropertyValue('--accent').trim(),
      info: cs.getPropertyValue('--info').trim(),
      violet: cs.getPropertyValue('--violet').trim()
    };
  }
  function makeChart(host, buildCfg) {
    if (typeof window.Chart === 'undefined') {
      host.innerHTML = '<p class="ask-note">Chart.js could not load — it comes from a CDN and needs a connection on ' +
        'first load. The same counts are in the table on this page.</p>';
      return;
    }
    var canvas = document.createElement('canvas');
    canvas.style.maxHeight = '260px';
    host.appendChild(canvas);
    var inst = new window.Chart(canvas, buildCfg(chartColors()));
    charts.push({ inst: inst, canvas: canvas, build: buildCfg });
  }
  themeListeners.push(function () {
    charts.forEach(function (c) {
      c.inst.destroy();
      c.inst = new window.Chart(c.canvas, c.build(chartColors()));
    });
  });

  /* ======================================================================
     8. Ask panel — Mode 1 offline search, Mode 2 Claude with your own key
     ==================================================================== */
  var MODELS = [
    { id: 'claude-opus-5', label: 'Claude Opus 5 — most capable', effort: true },
    { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 — balanced', effort: true },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 — fastest', effort: false }
  ];

  function buildAsk(host) {
    var cur = sectionById(SEC);
    var a = make('section', 'ask');
    a.id = 'ask';
    a.innerHTML =
      '<div class="ask-head">' +
        '<span class="at">Ask this blueprint</span>' +
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
          '<select class="ask-input" id="model" style="flex:0 1 230px">' +
            MODELS.map(function (m) { return '<option value="' + m.id + '">' + esc(m.label) + '</option>'; }).join('') +
          '</select>' +
          '<select class="ask-input" id="scope" style="flex:0 1 190px">' +
            '<option value="all">Scope: whole blueprint</option>' +
            '<option value="section">Scope: this section only</option>' +
          '</select>' +
          '<span class="ask-note" style="flex:1 1 100%">Your key is kept in this browser’s localStorage and sent only to ' +
            'api.anthropic.com. It is never written into these files.</span>' +
        '</div>' +
        '<div class="ask-row">' +
          '<input class="ask-input" id="askQ" type="text" placeholder="' +
            esc(cur ? 'e.g. what guarantees the day-one requirement?' : 'e.g. why is there an AI layer?') + '">' +
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
        : 'Answers only from this blueprint, using your own key. Search mode is always available as a fallback.';
    }
    el('#mLocal', a).addEventListener('click', function () { setMode('local'); });
    el('#mClaude', a).addEventListener('click', function () { setMode('claude'); });

    function askLocal(q) {
      var hits = search(q, 8);
      if (!hits.length) {
        out.innerHTML = '<div class="ask-err">Nothing in the blueprint matches “' + esc(q) + '”. ' +
          'That may itself be the answer — <a href="07-coverage.html">Coverage</a> lists what this design ' +
          'deliberately does not touch.</div>';
        return;
      }
      out.innerHTML = '<p class="ask-note">' + hits.length + ' passage' + (hits.length === 1 ? '' : 's') +
        ' from the blueprint, best first:</p>' +
        hits.map(function (e) {
          var href = e.file + '?q=' + encodeURIComponent(q) + (e.anchor ? '#' + e.anchor : '');
          return '<a class="hit" href="' + href + '"><span class="h-top"><span class="h-title">' + highlight(e.title, q) +
            '</span><span class="h-sec">' + esc(e.num + ' ' + e.sectionName) + '</span></span>' +
            '<span class="h-snip">' + snippet(e, q, 240) + '</span></a>';
        }).join('');
    }

    function scopedBlueprint() {
      if (el('#scope', a).value === 'all' || SEC === 'index') return B;
      var slim = { meta: B.meta, section: SEC };
      if (SEC === 'summary') { slim.idea = B.idea; slim.kpis = B.kpis; slim.artifacts = B.artifacts; }
      if (SEC === 'components') { slim.components = B.components; slim.layers = B.layers; slim.aiRationale = B.aiRationale; slim.deferred = B.deferred; }
      if (SEC === 'architecture') { slim.diagram = B.diagrams.architecture; slim.components = B.components; }
      if (SEC === 'flow') { slim.flow = B.flow; slim.diagram = B.diagrams.sequence; }
      if (SEC === 'build') { slim.phases = B.phases; slim.components = B.components; }
      if (SEC === 'assumptions') { slim.assumptions = B.assumptions; slim.openQuestion = B.openQuestion; }
      if (SEC === 'coverage') { slim.coverage = B.coverage; slim.deferred = B.deferred; }
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

      var data = scopedBlueprint();
      var system =
        'You are answering questions about a single system-architecture blueprint for a project called "' + B.meta.project + '".\n' +
        'The complete blueprint is the JSON below. Answer ONLY from it.\n' +
        'If the blueprint does not cover something, say plainly that the blueprint does not cover it and, when relevant, ' +
        'point at the coverage list — do not invent components, numbers, timelines or technologies that are not in the JSON.\n' +
        'Be concise and concrete. Prefer plain English a non-technical reader can follow. Refer to components by the exact ' +
        'names used in the JSON.\n\nBLUEPRINT JSON:\n' + JSON.stringify(data);

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
          var friendly = r.status === 401 ? 'That key was rejected. Check it, or use Search mode which needs no key.'
            : r.status === 429 ? 'Rate limited. Wait a moment and try again, or use Search mode which needs no key.'
            : r.status === 400 ? 'The request was rejected: ' + msg + ' Search mode still works.'
            : 'Request failed (HTTP ' + r.status + '): ' + msg + ' Search mode still works with no key.';
          out.innerHTML = '<div class="ask-err">' + esc(friendly) + '</div>';
          return;
        }
        if (r.json.stop_reason === 'refusal') {
          out.innerHTML = '<div class="ask-err">The model declined to answer that one. Try rephrasing, or use ' +
            '<b>Search — no key</b> mode.</div>';
          return;
        }
        var text = (r.json.content || []).filter(function (b2) { return b2.type === 'text'; })
          .map(function (b2) { return b2.text; }).join('\n').trim();
        out.innerHTML = text
          ? '<div class="ask-answer">' + esc(text) + '</div><p class="ask-note">Answered by ' + esc(model) +
            ' from the blueprint data only.</p>'
          : '<div class="ask-err">The model returned nothing readable. Try again, or use Search mode.</div>';
      }).catch(function (err) {
        out.innerHTML = '<div class="ask-err">Could not reach api.anthropic.com (' + esc(err.message) + '). ' +
          'You may be offline or the request was blocked by the browser. <b>Search — no key</b> mode works offline ' +
          'and answers from the same blueprint.</div>';
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
     9. Page renderers
     ==================================================================== */
  function card(html, cls) { return '<div class="card' + (cls ? ' ' + cls : '') + '" data-searchable>' + html + '</div>'; }

  var PAGES = {

    index: function () {
      var host = el('#tiles');
      var hero = el('#heroStats');
      if (hero) {
        var stats = [
          { v: B.components.length, k: 'components' },
          { v: B.phases.length, k: 'build phases' },
          { v: B.flow.length, k: 'flow steps' },
          { v: B.coverage.filter(function (c) { return c.status === 'deferred'; }).length, k: 'deferred' },
          { v: B.coverage.filter(function (c) { return c.status === 'out'; }).length, k: 'not covered' },
          { v: B.assumptions.length, k: 'assumptions' }
        ];
        hero.innerHTML = stats.map(function (s) {
          return '<div class="stat"><div class="v">' + s.v + '</div><div class="k">' + esc(s.k) + '</div></div>';
        }).join('');
      }
      B.sections.forEach(function (s) {
        var a = document.createElement('a');
        a.className = 'tile';
        a.href = s.file;
        a.setAttribute('data-searchable', '');
        var pic = ILLUS[s.preview] ? ILLUS[s.preview](true) : '';
        a.innerHTML =
          '<div class="tile-pic">' + pic + '</div>' +
          '<div class="tile-body">' +
            '<div class="tile-top"><span class="tile-num">' + esc(s.num) + '</span>' +
            '<span class="tile-name">' + esc(s.name) + '</span></div>' +
            '<div class="tile-blurb">' + esc(s.blurb) + '</div>' +
            '<div class="tile-count">' + esc(s.count(B)) + '</div>' +
          '</div>';
        host.appendChild(a);
      });
    },

    summary: function () {
      var host = el('#content');
      host.innerHTML =
        '<div class="card" data-searchable id="idea"><h3>The idea, exactly as written</h3>' +
          '<blockquote class="idea">' + esc(B.idea.paragraph) + '</blockquote></div>' +
        card('<h3>What it actually asks for</h3><p>' + esc(B.idea.restated) + '</p>');

      figure(host, 'The whole idea in one picture', B.idea.thesisWhy, function (b) { b.innerHTML = svgPipeline(false); });

      host.insertAdjacentHTML('beforeend',
        '<div class="callout" data-searchable id="thesis"><span class="lbl">The organising decision</span>' +
        '<p style="margin:0 0 8px"><b>' + esc(B.idea.thesis) + '</b></p>' +
        '<p style="margin:0;color:var(--muted)">' + esc(B.idea.thesisWhy) + '</p></div>');

      host.insertAdjacentHTML('beforeend', '<h2>Who it is for</h2><div class="grid three">' +
        B.idea.audiences.map(function (a, i) {
          return '<div class="card tight" data-searchable id="aud-' + i + '"><b>' + esc(a.name) + '</b>' +
            '<p style="margin:6px 0 0;color:var(--muted);font-size:14px">' + esc(a.note) + '</p></div>';
        }).join('') + '</div>');

      host.insertAdjacentHTML('beforeend', '<h2>The three things it holds</h2><div class="grid three">' +
        B.idea.contentTypes.map(function (c, i) {
          return '<div class="card tight" data-searchable id="ct-' + i + '">' +
            '<span class="pill ' + c.color + '">' + esc(c.name) + '</span>' +
            '<p style="margin:9px 0 4px"><b>' + esc(c.example) + '</b></p>' +
            '<p style="margin:0;color:var(--muted);font-size:13.5px">' + esc(c.nature) + '</p></div>';
        }).join('') + '</div>');

      host.insertAdjacentHTML('beforeend', '<h2>What "organised well" has to mean in practice</h2>' +
        '<p class="lede" style="font-size:15px">Design targets, not measurements — nothing has been built yet.</p>' +
        '<div class="table-scroll"><table><thead><tr><th>Target</th><th>Value</th><th>How it is held</th></tr></thead><tbody>' +
        B.kpis.map(function (k, i) {
          return '<tr data-searchable id="kpi-' + i + '"><td><b>' + esc(k.name) + '</b></td>' +
            '<td><span class="pill teal">' + esc(k.target) + '</span></td><td>' + esc(k.note) + '</td></tr>';
        }).join('') + '</tbody></table></div>');

      host.insertAdjacentHTML('beforeend', '<h2>What this blueprint produced</h2>' +
        '<div class="table-scroll"><table><thead><tr><th>Artifact</th><th>What it is</th><th>Where</th></tr></thead><tbody>' +
        B.artifacts.map(function (a, i) {
          return '<tr data-searchable id="art-' + i + '"><td><b>' + esc(a.name) + '</b></td><td>' + esc(a.what) +
            '</td><td><code style="font-size:12px">' + esc(a.path) + '</code></td></tr>';
        }).join('') + '</tbody></table></div>');
    },

    components: function () {
      var host = el('#content');
      figure(host, 'Every component, in its layer', 'Colour is the layer, and each component keeps that colour everywhere it appears in this blueprint.',
        function (b) { b.innerHTML = svgLayers(false); });

      B.layers.forEach(function (L) {
        var members = B.components.filter(function (c) { return c.layer === L.id; });
        if (!members.length) return;
        host.insertAdjacentHTML('beforeend', '<h2>' + esc(L.label) + '</h2>');
        members.forEach(function (c) {
          host.insertAdjacentHTML('beforeend',
            '<div class="card comp' + (c.guarantor ? ' guarantor' : '') + '" data-layer="' + esc(c.layer) +
              '" data-searchable id="c-' + esc(c.id) + '">' +
              '<div class="comp-top"><span class="comp-name">' + esc(c.name) + '</span>' +
              '<span>' + (c.guarantor ? '<span class="pill teal">guarantees day one</span> ' : '') +
              (c.ai ? '<span class="pill violet">model</span> ' : '') +
              '<span class="pill slate">phase ' + c.phase + '</span></span></div>' +
              '<p class="comp-does">' + esc(c.does) + '</p>' +
              '<div class="comp-req"><b>Required by:</b> ' + esc(c.required) + '</div>' +
            '</div>');
        });
      });

      host.insertAdjacentHTML('beforeend', '<h2>How many pieces, and where</h2>');
      figure(host, 'Components per layer', 'A count of the boxes in this design, nothing more — no estimates are charted here, because any number attached to effort would be invented.',
        function (b) {
          makeChart(b, function (C) {
            var labels = B.layers.map(function (L) { return L.label; });
            var vals = B.layers.map(function (L) {
              return B.components.filter(function (c) { return c.layer === L.id; }).length;
            });
            return {
              type: 'bar',
              data: { labels: labels, datasets: [{ label: 'components', data: vals,
                backgroundColor: [C.info, C.accent, C.slate, C.violet], borderRadius: 6 }] },
              options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { color: C.muted, precision: 0 }, grid: { color: C.border } },
                  y: { ticks: { color: C.ink }, grid: { display: false } }
                }
              }
            };
          });
        });

      host.insertAdjacentHTML('beforeend',
        '<h2 id="ai-why">Why there is an AI layer at all</h2>' +
        '<div class="callout info" data-searchable><span class="lbl">' + esc(B.aiRationale.claim) + '</span>' +
        '<p style="margin:0 0 10px">' + esc(B.aiRationale.detail) + '</p>' +
        '<p style="margin:0"><b>' + esc(B.aiRationale.guardrail) + '</b></p></div>');

      host.insertAdjacentHTML('beforeend', '<h2>Deliberately not built</h2>' +
        '<p class="lede" style="font-size:15px">A padded diagram is a worse answer than a small one. Each of these has a named trigger that would change the decision.</p>' +
        '<div class="table-scroll"><table><thead><tr><th>Not built</th><th>Why not</th><th>Build it when</th></tr></thead><tbody>' +
        B.deferred.map(function (d) {
          return '<tr data-searchable id="d-' + esc(d.id) + '"><td><b>' + esc(d.name) + '</b></td><td>' + esc(d.why) +
            '</td><td><span class="pill warn">trigger</span> ' + esc(d.trigger) + '</td></tr>';
        }).join('') + '</tbody></table></div>');
    },

    architecture: function () {
      var host = el('#content');
      var d = B.diagrams.architecture;
      var f = figure(host, d.title, d.reading, function (b) { renderMermaid(b, d.src); });
      f.id = 'arch';
      figure(host, 'The same map, simplified', 'The dashed outline is the Taxonomy Service — every write passes through it, which is what makes the day-one requirement enforceable rather than aspirational.',
        function (b) { b.innerHTML = svgNodeGraph(false); });

      host.insertAdjacentHTML('beforeend', '<h2>Reading the shapes</h2>' +
        '<div class="grid two"><div class="card tight" data-searchable>' +
        '<b>Shapes</b><ul style="margin:8px 0 0;padding-left:20px;color:var(--muted);font-size:14px">' +
        '<li><b>Rounded</b> — a person entering the system</li>' +
        '<li><b>Rectangle</b> — a service you build</li>' +
        '<li><b>Cylinder</b> — where things are kept</li>' +
        '<li><b>Hexagon</b> — a service you rent</li></ul></div>' +
        '<div class="card tight" data-searchable><b>The one rule the diagram encodes</b>' +
        '<p style="margin:8px 0 0;color:var(--muted);font-size:14px">There is no arrow from any screen straight to a store. ' +
        'Everything goes through the Content API, and every write goes through the Spine first. That is not a stylistic ' +
        'choice — it is the only place organisation can actually be guaranteed.</p></div></div>');

      host.insertAdjacentHTML('beforeend', '<h2>What crosses each connection</h2>' +
        '<div class="table-scroll"><table><thead><tr><th>From</th><th>To</th><th>What crosses</th></tr></thead><tbody>' +
        [['Student', 'Student Web App', 'opens a topic, saves a note, uploads a PDF'],
         ['Student Web App', 'Content API', 'asks for topics, opportunities and own notes'],
         ['Content API', 'Taxonomy Service', 'every tag on every item, before anything is saved'],
         ['Taxonomy Service', 'Content API', 'tags accepted, or refused with the valid list'],
         ['Content API', 'Library Database', 'reads and writes topics, opportunities, notes and tags'],
         ['Content API', 'Material Storage', 'stores the uploaded file, gets a link back'],
         ['PDF Filing Assistant', 'Claude API', 'page text plus the allowed tag list'],
         ['Freshness Checker', 'Library Database', 'nightly sweep for deadlines that have passed'],
         ['Content API', 'Student Web App', 'one organised page: topic, matching opportunities, own notes']]
        .map(function (r) {
          return '<tr data-searchable><td><b>' + esc(r[0]) + '</b></td><td><b>' + esc(r[1]) + '</b></td><td>' + esc(r[2]) + '</td></tr>';
        }).join('') + '</tbody></table></div>');
    },

    flow: function () {
      var host = el('#content');
      figure(host, 'The six steps at a glance', 'Only two of the six steps involve a model — switch it off and the journey still completes, with the student choosing tags by hand at step 4.',
        function (b) { b.innerHTML = svgRibbon(false); });

      var d = B.diagrams.sequence;
      var sf = figure(host, d.title, d.reading, function (b) { renderMermaid(b, d.src); });
      sf.id = 'seq';

      host.insertAdjacentHTML('beforeend', '<h2>Step by step</h2>');
      B.flow.forEach(function (f) {
        host.insertAdjacentHTML('beforeend',
          '<div class="card step' + (f.touchesModel ? ' model' : '') + '" data-searchable id="f-' + f.n + '">' +
            '<div class="num">' + f.n + '</div>' +
            '<div><div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap">' +
              '<b style="font-size:16px">' + esc(f.title) + '</b>' +
              '<span class="pill ' + (f.touchesModel ? 'violet' : 'slate') + '">' + esc(f.actor) + '</span></div>' +
              '<p style="margin:8px 0 0">' + esc(f.body) + '</p>' +
              '<span class="payload">carries: ' + esc(f.payload) + '</span>' +
            '</div></div>');
      });
    },

    build: function () {
      var host = el('#content');
      figure(host, 'Four phases, sized in proportion', 'Phase 1 is highlighted because every later phase inherits the vocabulary it decides — getting it wrong later costs a rewrite of everything filed against it.',
        function (b) { b.innerHTML = svgTimeline(false); });

      var d = B.diagrams.gantt;
      figure(host, d.title, d.reading, function (b) { renderMermaid(b, d.src); });

      B.phases.forEach(function (p) {
        var names = p.builds.map(function (id) {
          var c = compById(id);
          return c ? '<span class="pill ' + (LAYER_COLOR[c.layer] === 'accent' ? 'teal' : LAYER_COLOR[c.layer]) + '">' + esc(c.name) + '</span>' : '';
        }).join(' ');
        host.insertAdjacentHTML('beforeend',
          '<div class="card phase' + (p.makeOrBreak ? ' mob' : '') + '" data-searchable id="p-' + p.id + '">' +
            '<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap">' +
            '<b style="font-size:18px">Phase ' + p.id + ' — ' + esc(p.name) + '</b>' +
            (p.makeOrBreak ? '<span class="pill teal">make or break</span>' : '') + '</div>' +
            '<div style="margin:12px 0 0">' + names + '</div>' +
            '<div class="proves">Proves: ' + esc(p.proves) + '</div>' +
            '<p style="margin:0;color:var(--muted)">' + esc(p.why) + '</p>' +
          '</div>');
      });
    },

    assumptions: function () {
      var host = el('#content');
      host.insertAdjacentHTML('beforeend',
        '<div class="table-scroll"><table><thead><tr><th style="width:34px">#</th><th>Assumption</th>' +
        '<th style="width:92px">Severity</th><th>Impact if wrong</th></tr></thead><tbody>' +
        B.assumptions.map(function (a) {
          var tone = a.severity === 'high' ? 'risk' : (a.severity === 'medium' ? 'warn' : 'slate');
          return '<tr data-searchable id="a-' + a.id + '"><td><b>' + a.id + '</b></td><td><b>' + esc(a.text) + '</b></td>' +
            '<td><span class="pill ' + tone + '">' + esc(a.severity) + '</span></td><td>' + esc(a.impact) + '</td></tr>';
        }).join('') + '</tbody></table></div>');

      host.insertAdjacentHTML('beforeend', '<h2 id="fork">The one question that would most change this design</h2>' +
        '<div class="callout warn" data-searchable><p style="margin:0 0 6px;font-size:17px"><b>' +
        esc(B.openQuestion.question) + '</b></p><p style="margin:0;color:var(--muted)">' + esc(B.openQuestion.note) + '</p></div>');

      figure(host, 'What changes under each answer', 'The left branch is the design as drawn; the right branch adds an audience, a permissions model and a third screen — which is why this question is worth answering before Phase 1 rather than after.',
        function (b) { b.innerHTML = svgFork(false); });

      host.insertAdjacentHTML('beforeend', '<div class="grid two">' +
        B.openQuestion.branches.map(function (br) {
          return '<div class="card" data-searchable><span class="pill ' + (br.tone === 'good' ? 'good' : 'warn') + '">' +
            esc(br.label) + '</span><ul style="margin:12px 0 0;padding-left:20px">' +
            br.consequences.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul></div>';
        }).join('') + '</div>');
    },

    coverage: function () {
      var host = el('#content');
      figure(host, 'Coverage at a glance', 'Green is built by Phase 4, amber is deferred with a named trigger, and grey is honestly out of scope — the grey column is the part most blueprints leave unsaid.',
        function (b) { b.innerHTML = svgGrid(false); });

      figure(host, 'How the scope splits', 'A count of rows in the table below — the only quantities in this blueprint that are real rather than estimated.',
        function (b) {
          makeChart(b, function (C) {
            var counts = { 'in': 0, 'deferred': 0, 'out': 0 };
            B.coverage.forEach(function (c) { counts[c.status]++; });
            return {
              type: 'doughnut',
              data: {
                labels: ['Covered by this design', 'Deferred, with a trigger', 'Not covered'],
                datasets: [{ data: [counts['in'], counts.deferred, counts.out],
                  backgroundColor: [C.good, C.warn, C.slate], borderWidth: 0 }]
              },
              options: {
                responsive: true, maintainAspectRatio: false, cutout: '58%',
                plugins: { legend: { position: 'right', labels: { color: C.ink, boxWidth: 12, padding: 14 } } }
              }
            };
          });
        });

      [['in', 'Covered by this design', 'good'], ['deferred', 'Deferred, with a named trigger', 'warn'], ['out', 'What this design does not cover', 'slate']]
        .forEach(function (grp) {
          var rows = B.coverage.filter(function (c) { return c.status === grp[0]; });
          host.insertAdjacentHTML('beforeend', '<h2>' + esc(grp[1]) + ' <span class="pill ' + grp[2] + '">' + rows.length + '</span></h2>' +
            '<div class="table-scroll"><table><thead><tr><th>Area</th><th>Note</th></tr></thead><tbody>' +
            rows.map(function (c) {
              var i = B.coverage.indexOf(c);
              return '<tr data-searchable id="cov-' + i + '"><td><b>' + esc(c.area) + '</b></td><td>' + esc(c.note) + '</td></tr>';
            }).join('') + '</tbody></table></div>');
        });

      host.insertAdjacentHTML('beforeend',
        '<div class="callout risk" data-searchable><span class="lbl">The gap worth arguing about</span>' +
        '<p style="margin:0">There is no medical-accuracy review workflow. For a tool teaching anatomy and infectious ' +
        'disease to high school students, that is the omission most likely to matter, and it is a decision for a person, ' +
        'not a default.</p></div>');
    }
  };

  /* ======================================================================
     10. Boot
     ==================================================================== */
  function boot() {
    buildChrome();
    initMermaid();
    if (PAGES[SEC]) PAGES[SEC]();
    var askHost = el('#askHost');
    if (askHost) buildAsk(askHost);
    wireSearch();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
