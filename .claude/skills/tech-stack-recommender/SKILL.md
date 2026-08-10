---
name: tech-stack-recommender
description: Use when the user has a system architecture and wants a recommended tech stack, explained simply. Triggers on requests like "what should I build this with", "recommend a tech stack", "what database/framework should I use", "pick the technologies for my architecture", or a handoff after an architecture has been designed. Reads project-blueprint/architecture.md and picks one real, current technology per component, each with a 🟢/🟡/🔴 fit rating for THIS idea's actual scale, a one-sentence plain-English reason, and a copy-ready prompt to learn more — saved to project-blueprint/tech-stack.md. Do NOT use to choose technologies for an existing codebase (that stack already exists — the question there is migration, not selection).
---

# Tech Stack Recommender

Read an architecture and name **one real technology per component**, rated for
how well it fits *this* idea, explained in language the person who wrote the
idea can actually read. Save it to `project-blueprint/tech-stack.md`.

## Input

`project-blueprint/architecture.md` — the component list, the diagram, and the
data flows. Read it fully before recommending anything.

If that file does not exist, say so and offer to run `/system-architect` first,
then stop. Do not invent an architecture to recommend against.

## Hard rules

- **One technology per component.** Not a shortlist, not "either X or Y". The
  user asked what to build with; give them the answer. Alternatives, if worth
  mentioning at all, go in the notes column as a single clause.
- **Real and current only.** Every recommendation must be a technology that
  exists today, is actively maintained, and that a person can go install this
  afternoon. No deprecated tools, no "coming soon", no invented names, no
  versions you are not sure about — name the technology, not a version number,
  unless the version genuinely matters.
- **Rate for this idea's actual scale.** The rating is a judgment about *this*
  project — its real user count, data volume, budget, team size, and how much
  of it is a weekend prototype versus a system with paying customers. A
  technology that is 🟢 for a 50-user internal tool may be 🔴 for the same
  component in a consumer app, and vice versa. Rate accordingly.
- **Never rate everything 🟢.** If every row is green, the ratings carry no
  information and you have defaulted rather than judged. Real stacks contain
  tradeoffs — surface them.
- **Plain English, always.** One sentence per recommendation, written for
  someone who is not an engineer. If a technical term is unavoidable, define it
  inline in one short clause: "Postgres — a database that stores information in
  tables, like a very reliable spreadsheet."
- **Icons and short labels, never a wall of text.** Every row is scannable in a
  couple of seconds. If a cell needs a paragraph, the recommendation is not
  clear enough yet.
- **Every row ends with a copy-ready prompt.** See Learn-more prompts below.

## The fit ratings

| Icon | Label | Means |
|---|---|---|
| 🟢 | Great fit | Built for exactly this. Right scale, right complexity, nothing to watch out for. Pick it and move on. |
| 🟡 | Good fit | Works well, with one thing to know — a cost that grows, a limit you will hit later, a bit of setup, or a piece you would outgrow if the project takes off. |
| 🔴 | Consider carefully | The honest choice for this component, but it carries real weight: meaningful cost, operational burden, lock-in, or complexity beyond where this project is today. Name the specific concern. |

🔴 does **not** mean "bad technology" or "don't use this". It means: this one
deserves a decision, not a default.

Rate on these five, and let the weakest one set the rating:

1. **Scale match** — is this sized for the traffic and data this idea actually has?
2. **Cost at this stage** — free/cheap where it needs to be, and does it stay that way?
3. **Learning curve** — can the person building this pick it up?
4. **Operational burden** — who runs it, patches it, and gets paged when it breaks?
5. **Exit cost** — how hard is it to leave if this turns out to be wrong?

## Procedure

1. Read `project-blueprint/architecture.md`. List every component in it.
2. Establish the scale context: from the architecture (and the user, if they
   said), estimate users, data volume, budget sensitivity, team size, and
   whether this is a prototype or a system meant to run for real. Write these
   assumptions down — they are what the ratings are relative to, and the user
   must be able to see and correct them.
3. For each component, pick one technology. Match it to the scale context, not
   to what is fashionable and not to a default stack you would name for any
   project.
4. Rate it 🟢/🟡/🔴 against the five criteria. Where it is 🟡 or 🔴, name the
   specific concern in a few words.
5. Write the one-sentence plain-English "why".
6. Write the copy-ready learn-more prompt for that specific technology.
7. Sanity-check the whole stack: do these pieces work together, is anything
   redundant, and does the total monthly cost make sense for this project?
8. Save to `project-blueprint/tech-stack.md`, creating the directory if needed.
   Do not overwrite an existing file without saying so first.
9. Report the path and the fit-rating breakdown.

## Learn-more prompts

Every row ends with a prompt the user can copy and paste into a fresh
conversation later. It must:

- Name **the specific technology**, not "the database".
- Reference **their project**, so the explanation comes back concrete.
- Be written from the user's point of view, ready to paste with no editing.
- Be one sentence. Wrap it in backticks so it is obviously copyable.

Good: `Explain PostgreSQL to me like I'm new to databases, using my recipe-sharing app as the example.`

Good: `Show me what the first 20 lines of Next.js code would look like for my recipe app's homepage, and explain each line.`

Bad: `Tell me more about the database layer.` — not a real technology, not their project, not pasteable.

## Output format

Write exactly this structure to `project-blueprint/tech-stack.md`.

```markdown
# <Project name> — Recommended Tech Stack

## What this is sized for
<2-3 short bullets: the scale, budget, and team assumptions the ratings are
based on. Tell the user to correct these if they are wrong, because the ratings
move with them.>

## The stack at a glance
| Fit | Component | Technology |
|---|---|---|
| 🟢 | <Component> | <Technology> |

## The recommendations
<One block per component — keep each one short enough to read at a glance.>

### <Icon> <Component> → **<Technology>**
**Why:** <One plain-English sentence.>
**Watch out for:** <Only for 🟡 and 🔴 — one short clause naming the specific concern. Omit for 🟢.>
**Learn more:** `<Copy-ready prompt naming this technology and this project.>`

## What this costs to start
<A few lines: what is free, what is not, and a rough monthly figure at the
scale above. Say plainly where you are estimating.>

## What to build first
<2-4 numbered steps: the order to set these up in, so the user has somewhere to
start on Monday morning.>

## Decisions worth revisiting
<Every 🔴, and any 🟡 that becomes a problem at scale — with the signal that
tells the user it is time to revisit. Omit if there are none.>
```

## Final report

After saving, report to the user:

1. **The exact path** to the saved file.
2. **The fit-rating breakdown** — how many 🟢, how many 🟡, how many 🔴, and a
   one-line note on what drove any 🔴.
