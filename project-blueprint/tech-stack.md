# Pre-Med Study Desk — Recommended Tech Stack

*One real technology per component in `project-blueprint/architecture.md`, rated for
this project's actual size, explained in plain English.*

Generated 2026-08-06 · 17 recommendations · 10 architecture components + 7 things the data flow needs

---

## The fit-rating key

| Icon | Label | What it means for you |
|---|---|---|
| 🟢 | **Great fit** | Built for exactly this. Right size, right cost, nothing to watch out for. Pick it and move on. |
| 🟡 | **Good fit** | Works, but there is one real thing to know before you commit — a cost that grows, a limit you will hit, or a piece you would outgrow. Read the watch-out. |
| 🔴 | **Consider carefully** | Still the honest recommendation, but it carries real weight: money, lock-in, or a promise it only half keeps. This one deserves a decision, not a default. |

🔴 does **not** mean "bad technology." It means: stop here and choose on purpose.

---

## Where this stack is most likely to break

Two places, and neither is a framework argument. **First, Clerk.** You would be renting
identity — for people who may be 15 years old — from a company whose bill grows with every
active student, and it is the one piece on this list you cannot cheaply take back if you
change your mind. **Second, Phase 4's upload path.** Your own architecture deliberately
skipped a job queue, which means pulling text out of a PDF *and* asking a model to tag it
both happen inside one web request while the student watches a spinner. That is a fine bet
for a handful of two-page handouts and a bad one the first time somebody uploads a 60-page
scanned lecture deck — which will also return no text at all, because a scan is a picture.
Everything else here is replaceable in an afternoon.

---

## What this is sized for

Correct these if they are wrong — every rating moves with them.

- **Hundreds of students, not hundreds of thousands.** A few dozen at launch, maybe a
  couple thousand if it catches on at a school or two. Far more reading than writing.
- **One to three people building it,** probably part-time, with no dedicated person to run
  servers or get paged at 2am.
- **A budget near zero at the start** — this should cost less than a streaming subscription
  until real students are using it.
- **A small library.** Thousands of items, not millions. PDFs of a few megabytes each.
- **Sensitive-ish data.** Personal notes and possibly minors' accounts. Not medical records,
  but not throwaway either.
- **Phased, not all at once.** Phases 1–3 must run for months before Phase 4's model call
  ever fires.

---

## The stack at a glance

Architecture component order, so you can lay this beside `architecture.md`.

| Fit | Component | Technology |
|---|---|---|
| 🟡 | Student Web App | React + Vite |
| 🟡 | Curator Console | TipTap |
| 🟢 | Content API | Fastify (TypeScript) |
| 🔴 | Taxonomy Service — the Spine | Zod |
| 🟢 | Library Database | PostgreSQL |
| 🟢 | Material Storage | Cloudflare R2 |
| 🔴 | Accounts and Sign-in | Clerk |
| 🟡 | Opportunity Freshness Checker | GitHub Actions scheduled workflow |
| 🟡 | PDF Filing Assistant | `@anthropic-ai/sdk` (tool use) |
| 🟡 | Anthropic Claude API | Claude Haiku 4.5 |

**Plus seven your data flow needs that the component list never named:**

| Fit | What the flow needs | Technology |
|---|---|---|
| 🟡 | Pull the text out of an uploaded PDF (step 3) | `pdfjs-dist` (Mozilla's PDF.js) |
| 🟢 | Show a stored PDF back to the student (step 6) | The browser's own PDF viewer, via `<iframe>` |
| 🟢 | Let your code talk to those tables safely | Drizzle ORM |
| 🟢 | Search inside the library | PostgreSQL full-text search |
| 🟢 | Put the two screens on the internet | Cloudflare Pages |
| 🟡 | Run the Content API somewhere | Railway |
| 🟡 | Run PostgreSQL somewhere | Neon |

**Breakdown: 7 🟢 · 8 🟡 · 2 🔴**

---

## The recommendations

### Things a person touches

#### 🟡 Student Web App → **React + Vite**

**Why:** The most widely known way to build screens, paired with the fastest tool for
turning them into a website — so when you get stuck, someone has already written the answer.

> **⚠ Watch out for:** This builds a page that assembles itself *in* the browser, which
> means Google cannot read your curated topic pages. If students are meant to find you by
> searching "cardiovascular anatomy for pre-med," you will need server rendering later.

**Learn more:** `Explain React with Vite to me like I've never built a website, using my Pre-Med Study Desk as the example — what would a topic page actually be made of?`

---

#### 🟡 Curator Console → **TipTap**

**Why:** Your curators need to write real topic pages with headings, bold text and lists,
and TipTap gives them a familiar writing box inside the app you are already building.

> **⚠ Watch out for:** Save what they write as TipTap's structured data, not as raw web
> code. Storing raw web code means you can never fully trust what gets displayed, and it is
> extremely painful to undo once you have 200 topic pages.

**Learn more:** `Show me how a curator would write a topic page in TipTap for my Pre-Med Study Desk, and explain exactly what gets saved to the database when they hit publish.`

---

### Things you write

#### 🟢 Content API → **Fastify (TypeScript)**

**Why:** A small, fast server that checks every incoming request against a written rulebook
before it reaches your code — which is precisely the job your architecture gives the
Content API.

**Learn more:** `Explain what a Fastify server does, using my Pre-Med Study Desk's Content API as the example — walk me through what happens when a student asks for the Cardiovascular topic.`

---

#### 🔴 Taxonomy Service — the Spine → **Zod**

**Why:** Zod lets you write your body-system / discipline / level vocabulary down once, in
one file, and refuse anything that does not match it — which is the entire day-one promise.

> **🔴 Consider carefully:** Your architecture calls the Spine a *service*; I am recommending
> a *library*. A library only guards the code that remembers to call it. That is the right
> simplification at this size, but it is not automatic — you must also make the tags a real
> database link (a "foreign key"), so that even a script written at 2am physically cannot
> save an unknown tag. Do that in Phase 1 or the guarantee is only as strong as your memory.

**Learn more:** `Explain Zod to me like I'm not a programmer, and show me the Zod schema plus the database foreign key that together stop my Pre-Med Study Desk from ever saving a note with an invalid Spine tag.`

---

#### 🟡 Opportunity Freshness Checker → **GitHub Actions scheduled workflow**

**Why:** A free nightly alarm clock that already lives next to your code, so the job that
retires expired opportunities needs no extra server and no extra bill.

> **⚠ Watch out for:** Two quirks. The alarm can go off late — sometimes by an hour when
> GitHub is busy — so never build anything that must run at exactly 3am. And GitHub switches
> these off automatically after 60 days with no activity in the repository, which is a very
> quiet way for your opportunity list to start rotting.

**Learn more:** `Explain GitHub Actions scheduled workflows to me from scratch, and write the nightly job that retires past-deadline opportunities in my Pre-Med Study Desk safely if it runs twice.`

---

#### 🟡 PDF Filing Assistant → **`@anthropic-ai/sdk` (tool use)**

**Why:** Anthropic's official toolkit has a feature that forces the model to answer in a
shape you define — so it can only pick tags from your Spine's list, never invent one.

> **⚠ Watch out for:** Your architecture knowingly skipped the job queue, so reading the PDF
> and asking the model both happen while the student waits. Test with a genuinely large
> handout early. When uploads routinely pass ~30 seconds, that deferred queue has become due.

**Learn more:** `Explain the Anthropic TypeScript SDK's tool use to me simply, and show how my Pre-Med Study Desk's PDF Filing Assistant would force Claude to choose only from my allowed Spine tag list.`

---

### Things you store

#### 🟢 Library Database → **PostgreSQL**

**Why:** The one database that can hold topics, opportunities, notes and tags in separate
tables and still answer "give me everything about the heart" in a single question — which is
step 6 of your data flow, exactly.

**Learn more:** `Explain PostgreSQL to me like I'm new to databases, using my Pre-Med Study Desk as the example — what tables would I actually have for topics, opportunities, notes and tags?`

---

#### 🟢 Material Storage → **Cloudflare R2**

**Why:** A cheap place to keep uploaded PDFs that — unlike almost every competitor — does
not charge you every time a student re-opens the same lecture handout.

**Learn more:** `Explain Cloudflare R2 to me like I've never stored a file in the cloud, using my Pre-Med Study Desk's uploaded lecture PDFs as the example.`

---

### Things you depend on

#### 🔴 Accounts and Sign-in → **Clerk**

**Why:** Sign-in done properly is a security minefield, and Clerk hands you working
accounts, email verification and student-versus-curator roles in an afternoon.

> **🔴 Consider carefully:** Three things stack up here. **Money:** free to 10,000 active
> users, then it charges per active student — on a product students do not pay for.
> **Minors:** you would be handing the identities of possibly-15-year-olds to a third
> company, and your architecture already flags minors' data protection as undesigned.
> **Exit:** this is the single hardest thing on this list to leave. Everything else you can
> swap in a week; user accounts you cannot. Also note your architecture's own open question —
> if *schools* end up putting students here rather than students signing themselves up, this
> decision changes shape entirely.

**Learn more:** `Explain Clerk to me simply, and tell me honestly what I would have to think about — legally and practically — using it for under-18 students signing up to my Pre-Med Study Desk.`

---

#### 🟡 Anthropic Claude API → **Claude Haiku 4.5**

**Why:** The fastest and cheapest Claude model, and matching a document against a fixed list
of tags is exactly the kind of job it is best at — you do not need a bigger one.

> **⚠ Watch out for:** This is the first thing in the whole system that costs money every
> single time it is used. Cap how many PDFs one student can upload per day, or one
> enthusiastic user with a folder of 400 lecture decks becomes your largest bill.

**Learn more:** `Explain how Claude Haiku 4.5 is priced and how fast it is, and estimate what my Pre-Med Study Desk would spend if 200 students each upload 3 lecture PDFs a month.`

---

### Things the data flow needs

*These never appear in your component list. Your data flow cannot happen without them.*

#### 🟡 Pull the text out of an uploaded PDF (flow step 3) → **`pdfjs-dist` (Mozilla's PDF.js)**

**Why:** The same PDF engine already inside Firefox and Chrome, which you can run on your
server to turn a lecture handout into plain text for the Filing Assistant to read.

> **⚠ Watch out for:** A scanned or photographed handout is a **picture** of a page, not
> text — this will return nothing at all for it. Reading those needs OCR, which your
> architecture does not include. Decide now what the student sees when extraction comes back
> empty; "pick your tags by hand" is a perfectly good answer, but it has to be a designed one.

**Learn more:** `Explain pdfjs-dist to me like I've never handled a PDF in code, show how my Pre-Med Study Desk would pull the text out of a 40-page lecture handout, and tell me what happens with a scanned one.`

---

#### 🟢 Show a stored PDF back to the student (flow step 6) → **The browser's own PDF viewer, via `<iframe>`**

**Why:** Every modern browser already ships a perfectly good PDF reader, so displaying a
student's uploaded handout is one line of code and zero new technology.

**Learn more:** `Show me the simplest way to display a stored PDF back to a student in my Pre-Med Study Desk using the browser's own viewer, and explain what I give up by not adding a PDF library.`

---

#### 🟢 Let your code talk to those tables safely → **Drizzle ORM**

**Why:** It turns your database tables into something your code understands, so a typo in a
tag column is caught while you are writing it rather than when a student hits save.

**Learn more:** `Explain Drizzle ORM to me like I'm new to databases, using my Pre-Med Study Desk's topics, opportunities, notes and tags tables as the example.`

---

#### 🟢 Search inside the library → **PostgreSQL full-text search**

**Why:** Your database can already search text properly, so you get search for free without
running a second system that has to be kept in step with the first.

**Learn more:** `Explain PostgreSQL full-text search to me simply, and write the one query that pulls the topic page, live opportunities and my own notes for Cardiovascular in my Pre-Med Study Desk.`

---

#### 🟢 Put the two screens on the internet → **Cloudflare Pages**

**Why:** Free hosting for the student app and curator console, from the same company already
holding your PDFs, with no server to think about.

**Learn more:** `Explain Cloudflare Pages to me like I've never deployed a website, and walk me through putting my Pre-Med Study Desk's student app online for free.`

---

#### 🟡 Run the Content API somewhere → **Railway**

**Why:** The least fiddly way to get a server online — connect your code, press deploy, and
it stays up without you learning anything about infrastructure.

> **⚠ Watch out for:** There is no real free tier and you are billed for what you use, so a
> bug that loops forever bills forever. Set a spending cap on day one, before you deploy
> anything.

**Learn more:** `Explain Railway to me like I've never run a server, walk me through deploying my Pre-Med Study Desk's Content API, and show me exactly where to set a spending cap.`

---

#### 🟡 Run PostgreSQL somewhere → **Neon**

**Why:** A hosted PostgreSQL with a genuinely free tier that costs nothing while nobody is
using your app — which is most of the time in your first six months.

> **⚠ Watch out for:** To be free, it goes to sleep when idle, so the first student of the
> morning waits about half a second longer than everyone else. Harmless here, but do not
> build a "we respond in 200ms" promise on top of it.

**Learn more:** `Explain Neon to me like I'm new to hosted databases, and tell me what actually happens to my Pre-Med Study Desk when nobody has used it for an hour.`

---

## Every copy-ready prompt, in one place

| # | Technology | Paste this |
|---|---|---|
| 1 | React + Vite | `Explain React with Vite to me like I've never built a website, using my Pre-Med Study Desk as the example — what would a topic page actually be made of?` |
| 2 | TipTap | `Show me how a curator would write a topic page in TipTap for my Pre-Med Study Desk, and explain exactly what gets saved to the database when they hit publish.` |
| 3 | Fastify | `Explain what a Fastify server does, using my Pre-Med Study Desk's Content API as the example — walk me through what happens when a student asks for the Cardiovascular topic.` |
| 4 | Zod | `Explain Zod to me like I'm not a programmer, and show me the Zod schema plus the database foreign key that together stop my Pre-Med Study Desk from ever saving a note with an invalid Spine tag.` |
| 5 | GitHub Actions | `Explain GitHub Actions scheduled workflows to me from scratch, and write the nightly job that retires past-deadline opportunities in my Pre-Med Study Desk safely if it runs twice.` |
| 6 | `@anthropic-ai/sdk` | `Explain the Anthropic TypeScript SDK's tool use to me simply, and show how my Pre-Med Study Desk's PDF Filing Assistant would force Claude to choose only from my allowed Spine tag list.` |
| 7 | PostgreSQL | `Explain PostgreSQL to me like I'm new to databases, using my Pre-Med Study Desk as the example — what tables would I actually have for topics, opportunities, notes and tags?` |
| 8 | Cloudflare R2 | `Explain Cloudflare R2 to me like I've never stored a file in the cloud, using my Pre-Med Study Desk's uploaded lecture PDFs as the example.` |
| 9 | Clerk | `Explain Clerk to me simply, and tell me honestly what I would have to think about — legally and practically — using it for under-18 students signing up to my Pre-Med Study Desk.` |
| 10 | Claude Haiku 4.5 | `Explain how Claude Haiku 4.5 is priced and how fast it is, and estimate what my Pre-Med Study Desk would spend if 200 students each upload 3 lecture PDFs a month.` |
| 11 | `pdfjs-dist` | `Explain pdfjs-dist to me like I've never handled a PDF in code, show how my Pre-Med Study Desk would pull the text out of a 40-page lecture handout, and tell me what happens with a scanned one.` |
| 12 | Browser PDF viewer | `Show me the simplest way to display a stored PDF back to a student in my Pre-Med Study Desk using the browser's own viewer, and explain what I give up by not adding a PDF library.` |
| 13 | Drizzle ORM | `Explain Drizzle ORM to me like I'm new to databases, using my Pre-Med Study Desk's topics, opportunities, notes and tags tables as the example.` |
| 14 | PostgreSQL full-text search | `Explain PostgreSQL full-text search to me simply, and write the one query that pulls the topic page, live opportunities and my own notes for Cardiovascular in my Pre-Med Study Desk.` |
| 15 | Cloudflare Pages | `Explain Cloudflare Pages to me like I've never deployed a website, and walk me through putting my Pre-Med Study Desk's student app online for free.` |
| 16 | Railway | `Explain Railway to me like I've never run a server, walk me through deploying my Pre-Med Study Desk's Content API, and show me exactly where to set a spending cap.` |
| 17 | Neon | `Explain Neon to me like I'm new to hosted databases, and tell me what actually happens to my Pre-Med Study Desk when nobody has used it for an hour.` |

---

## What to learn first, in order

This order is not arbitrary — it follows your own build phases. Each rung is only useful
once the one below it exists.

1. **PostgreSQL** — everything else is a wrapper around the shape you choose here. Get the
   tag tables right and Phase 1 is most of the way done. *(Phase 1)*
2. **Drizzle ORM** — how your code reaches those tables without typos becoming bugs. *(Phase 1)*
3. **Zod** — the Spine itself, and the day-one promise. Learn it beside the foreign keys, not
   instead of them. *(Phase 1)*
4. **Fastify** — the only door into the system. Once 1–3 exist, this is mostly wiring. *(Phase 1)*
5. **React + Vite, deployed to Cloudflare Pages** — the first time you see a topic page.
   Learn deploying at the same time; a site nobody can open is not finished. *(Phase 1)*
6. **TipTap** — only once curators actually need to write. Skip it entirely if you are
   seeding topic pages yourself. *(Phase 2)*
7. **Clerk, then Cloudflare R2, then `pdfjs-dist`** — identity first, because a personal shelf
   is meaningless without knowing whose it is. *(Phase 3)*
8. **`@anthropic-ai/sdk` with Claude Haiku 4.5** — last, deliberately, exactly as your
   architecture ordered it. Learning this first is the most common way this project stalls. *(Phase 4)*

**GitHub Actions, Railway and Neon** are not really "learned" — you set each up once in an
afternoon and rarely touch them again.

---

## Alternatives considered, and why not

| Chosen | Instead of | Why not |
|---|---|---|
| React + Vite | Next.js | Server rendering would let Google find your topic pages — genuinely valuable, eventually. But it adds a whole rendering model for one person to hold in their head, for a benefit you cannot use until there is content worth finding. |
| PostgreSQL + Clerk + R2 separately | Supabase (all three in one) | One vendor, one bill, less juggling. Rejected because it puts your database, your files *and* minors' identities behind a single account — and because leaving Supabase later means leaving all three at once. Revisit if three dashboards genuinely slow you down. |
| Clerk | Auth.js, self-hosted | Cheaper and no lock-in at all. Rejected because you would own password hashes and session security for minors on a part-time team. That is the bigger risk today, not the smaller one. |
| PostgreSQL full-text search | Typesense or Elasticsearch | Your own architecture says Postgres covers you to ~50,000 items. You have zero. A search server now is a second database to keep in step with the first. |
| Fastify | Express | Express is more familiar and has more tutorials. Fastify wins because it checks requests against a schema at the door, which is exactly where the Spine belongs. |
| TipTap | Plain Markdown files | If your curators are comfortable writing Markdown, drop TipTap entirely — it is the most over-built piece on this list if that turns out to be true. |
| GitHub Actions cron | `pg_cron` inside PostgreSQL | Elegant: the nightly sweep is one SQL statement, so it needs no app at all. Rejected because it depends on your database host offering it, and Neon's free tier suspends when idle. |
| `pdfjs-dist` | `unpdf` | A friendlier wrapper over the same Mozilla engine. Either is fine; `pdfjs-dist` is the one with a decade of use behind it. Swapping is a one-file change. |
| Cloudflare R2 | Amazon S3 | S3 charges for every byte a student downloads, and students re-open the same PDFs repeatedly. R2 charges nothing for that. |
| Neon + Railway | Railway for both | One dashboard instead of two, about $5/month more. You would lose Neon's free tier and the ability to branch your database like code. A reasonable trade if two bills annoy you more than the money. |

---

## How hard each decision is to undo

**1 = swap it in an afternoon. 5 = you are not really going to.**

| Undo | Technology | What actually makes it hard |
|---|---|---|
| **5** | Clerk | Your users' accounts, sessions and password hashes live there, not with you. Moving means every student re-registers. This is the one to think about now. |
| **3** | TipTap | Your topic pages get stored in its own document shape. Converting 200 pages later is a scripting job, not a config change. |
| **2** | Cloudflare R2 / Railway / Neon / Claude Haiku / Drizzle / React + Vite / Fastify / `@anthropic-ai/sdk` | A weekend each, at most. R2 speaks the same language as S3; Neon is just PostgreSQL; Railway is a container anyone can run. |
| **1** | PostgreSQL / Zod / `pdfjs-dist` / Cloudflare Pages / GitHub Actions / Postgres full-text search / browser PDF viewer | Genuinely disposable. PostgreSQL is rated 1 not because you would leave it, but because your data comes out cleanly if you did. |

**The pattern worth noticing:** everything you *write* is cheap to change. Everything you
*rent* is not. Clerk is the only 4-or-5 on the entire list.

---

## What this costs to start

| Item | Day one | Once it is real | Note |
|---|---|---|---|
| Cloudflare Pages | $0 | $0 | Free at this size, comfortably |
| Neon (PostgreSQL) | $0 | ~$19/mo | Free tier sleeps when idle |
| Railway (Content API) | ~$5 | ~$10–20/mo | Billed by use — set a cap |
| Cloudflare R2 (PDFs) | $0 | ~$1–5/mo | 10 GB free, no download charges |
| Clerk (accounts) | $0 | ~$25/mo and up | Free to 10,000 active users |
| Claude Haiku 4.5 | ~$1 | ~$3–10/mo | Pennies per upload, pay per use |
| GitHub Actions | $0 | $0 | Free minutes cover a nightly job easily |

**Day one: roughly $5–10 a month.** **At around 1,000 active students who upload: roughly
$30–60 a month,** and Clerk plus Railway are most of it.

These are estimates from published pricing, not quotes. Check each before you rely on the
number — provider pricing changes faster than this document does.

---

## What to build first

1. **PostgreSQL on Neon, with the tag tables and their foreign keys.** Nothing else until
   the vocabulary is real and the database physically refuses an unknown tag.
2. **Fastify + Drizzle + Zod — the write path only.** Prove you cannot save a topic without
   valid tags. That is Phase 1's whole point.
3. **React + Vite on Cloudflare Pages, showing topic pages.** First thing a person can look at.
4. **Set the Railway spending cap** before you deploy anything that could loop.

---

## Where I am least confident

Said plainly, because a rating you cannot argue with is not worth much.

1. **Clerk (🔴) — the least confident call on this list.** Your architecture's own open
   question is "is a student here on their own, or is a school putting them here?" That
   question decides this row. Self-serve students → Clerk is right. Schools with rosters →
   you need organisations, cohorts and possibly school SSO, and the answer may not be Clerk
   at all. **I am recommending an identity provider before the identity question is settled.**
   If you answer that question first, come back and re-read this row.

2. **Railway (🟡) versus Fly.io versus Render.** Genuinely close. I picked Railway for
   friendliness, not because your architecture demands it. Nothing in your design would look
   different under the other two — this is taste and budget, and you should feel free to
   overrule it.

3. **TipTap (🟡).** This assumes curators want a rich writing experience. If your curator is
   one technical person seeding Markdown files, TipTap is dead weight and I have added a
   dependency you do not need. I could not tell from the architecture which is true.

Least confident *the other way* — a rating I might be under-selling: **`pdfjs-dist` at 🟡
could reasonably be 🔴.** "Scanned handouts return nothing" is not a small caveat for a tool
aimed at students photographing lecture slides. I kept it at 🟡 only because your design
already says the student can tag by hand — the fallback exists. If that fallback turns out
to be the *common* path rather than the rare one, Phase 4 is not worth building as designed.

---

## What this document does not tell you

Named honestly, so nothing here reads as covered when it is not.

- **What this costs at 10,000 students.** The day-one figure is reliable; the growth curve
  is not modelled, and Clerk's is the one that bends sharply.
- **Whether the Spine's three axes are the right axes.** No technology answers that. Only
  Phase 1 does.
- **Anything about minors' consent, data retention or export rights.** That is a legal
  question, not a stack question, and your architecture already flags it as undesigned.
- **OCR for scanned handouts.** Not chosen, not costed, not in your architecture.
- **Medical accuracy review.** Still a person's job. No tool on this list checks whether a
  topic page is correct.
- **Testing, CI, or a deployment pipeline** beyond the nightly job.
- **Accessibility tooling.** Assumed as a build standard, not specified.
- **Version numbers.** These move faster than this document. Install the current release of
  each and check its own docs.
- **Whether school-mediated signup flips the Clerk decision.** It probably does. See above.

---

*Companion knowledge base: `project-blueprint/stack/index.html` · Architecture:
`project-blueprint/architecture.md`*