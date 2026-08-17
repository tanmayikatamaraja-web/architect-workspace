# AI SAT Study Agent — Command Center

One page that shows what is being built, what it is meant to move, and how far along it is.
Nine tabs. Overview is built; the other eight are reachable and say plainly that they are not built yet.

## Run it

```bash
cd ~/sat-command-center/command-center
python3 -m http.server 8777
```

Then open <http://localhost:8777>. It uses ES modules, so it must be served over http — opening
`index.html` from the filesystem will not work. No build step, no dependencies.

`?data=sample` / `?data=real` in the URL sets the starting mode (handy for demo links and screenshots).
Otherwise the last choice is remembered. **Real is the default.**

## The one rule

**All data comes from `data/project.js`.** No view file contains a project fact. When the real system
exists, that module is what gets pointed at it — swap the literals for `fetch()` calls returning the
same shapes, and no tab needs rewriting.

- `null` means *we do not know this yet*. It renders as an honest empty state. Never replace a `null`
  with a guess.
- Anything connectable carries `{status, lastChecked}`. `lastChecked: null` means never checked, and
  renders grey — never green.

## Files

| Path | What it is |
|---|---|
| `data/project.js` | **Single source of truth.** Requirements, stories, releases, guardrails, systems, owners, milestones. |
| `data/sample.js` | Sample overlay. May only fill in what real mode does not know; never contradicts a real fact. Everything it injects is marked `_sample: true` and labelled on screen. |
| `js/store.js` | Mode switch (real/sample) + derived helpers (dates, current release, story lookups). |
| `js/routes.js` | Tab registry — drives sidebar, breadcrumbs, router. |
| `js/app.js` | Shell and hash router. |
| `js/ui.js` | Render helpers: card, status dot, empty state, section. No project facts. |
| `js/views/overview.js` | Tab 1 and its seven drill-down pages. |
| `js/views/stub.js` | Honest placeholder for tabs 2–9. |
| `assets/theme.css` | **The only place colours are defined.** Neutral palette; no brand colour chosen yet — change `--accent` here and nowhere else. |

## Sample vs real

The switch is global and visible on every tab. In sample mode a banner sits at the top of every page
and every injected value carries a `SAMPLE` chip. Requirements, stories, releases and dates are
identical in both modes — sample only fills the gaps, so it can never teach you a false fact about
your own project.

## State on 17 Aug 2026

Nothing is live, nothing is connected, no outcome target is defined, and no build-status source is
wired up. The Overview says all four of those out loud rather than showing a healthy-looking dashboard
before anything is built.

## Next

Tabs 2–9, in the order they are numbered. Two things to settle first:

1. **No numeric outcome exists.** Without a target there is no way to say whether the agent helped
   anyone. Outcomes (tab 2) is built as an empty state until one is set.
2. **The data model (tab 9) is to be reviewed before any table is created.**
