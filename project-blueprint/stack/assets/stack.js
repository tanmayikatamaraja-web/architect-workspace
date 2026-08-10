/* ============================================================================
   stack.js — THE single source of truth for this knowledge base.
   Every page renders from this object. If a number appears twice in this file
   that is a bug: derive it instead (see the count() functions on sections).

   Loaded with a classic <script src>. `const` at top level is a global lexical
   binding, NOT a property of window — other scripts reference the bare
   identifier STACK, never window.STACK.
   ========================================================================== */

const STACK = {

  meta: {
    project: 'Pre-Med Study Desk',
    tagline: 'One real technology per component in the architecture, rated for this project’s actual size, explained in plain English.',
    architecturePath: 'project-blueprint/architecture.md',
    docPath: 'project-blueprint/tech-stack.md',
    architectureKB: '../index.html',
    generated: '2026-08-06'
  },

  /* ---- The fit-rating key ------------------------------------------------ */
  ratings: [
    {
      id: 'green', icon: '🟢', label: 'Great fit', tone: 'good',
      means: 'Built for exactly this. Right size, right cost, nothing to watch out for. Pick it and move on.'
    },
    {
      id: 'amber', icon: '🟡', label: 'Good fit', tone: 'warn',
      means: 'Works, but there is one real thing to know before you commit — a cost that grows, a limit you will hit, or a piece you would outgrow. Read the watch-out.'
    },
    {
      id: 'red', icon: '🔴', label: 'Consider carefully', tone: 'risk',
      means: 'Still the honest recommendation, but it carries real weight: money, lock-in, or a promise it only half keeps. This one deserves a decision, not a default.'
    }
  ],
  ratingNote: '🔴 does not mean “bad technology”. It means: stop here and choose on purpose.',

  /* ---- Where this is most likely to break -------------------------------- */
  headline: {
    claim: 'Two places, and neither is a framework argument.',
    first: 'Clerk. You would be renting identity — for people who may be 15 years old — from a company whose bill grows with every active student, and it is the one piece on this list you cannot cheaply take back if you change your mind.',
    second: 'Phase 4’s upload path. Your architecture deliberately skipped a job queue, so pulling text out of a PDF and asking a model to tag it both happen inside one web request while the student watches a spinner. That is a fine bet for a handful of two-page handouts and a bad one the first time somebody uploads a 60-page scanned lecture deck — which will also return no text at all, because a scan is a picture.',
    closer: 'Everything else here is replaceable in an afternoon.'
  },

  /* ---- The scale the ratings are relative to ----------------------------- */
  scale: [
    { k: 'How many students', v: 'Hundreds, not hundreds of thousands', note: 'A few dozen at launch, maybe a couple of thousand if it catches on at a school or two. Far more reading than writing.' },
    { k: 'How many builders', v: 'One to three, part-time', note: 'Nobody dedicated to running servers, nobody to page at 2am.' },
    { k: 'Budget', v: 'Near zero at the start', note: 'This should cost less than a streaming subscription until real students are using it.' },
    { k: 'How much data', v: 'Thousands of items, not millions', note: 'PDFs of a few megabytes each. Well inside what one database handles comfortably.' },
    { k: 'How sensitive', v: 'Sensitive-ish', note: 'Personal notes and possibly minors’ accounts. Not medical records, but not throwaway either.' },
    { k: 'How it ships', v: 'Phased, not all at once', note: 'Phases 1–3 must run for months before Phase 4’s model call ever fires.' }
  ],
  scaleWarning: 'Correct any of these if they are wrong — every rating on this site moves with them.',

  /* ---- Groups ------------------------------------------------------------ */
  groups: [
    { id: 'touch',  label: 'Things a person touches', blurb: 'The screens a student or a curator actually looks at.' },
    { id: 'write',  label: 'Things you write',        blurb: 'Code you own, running on machines you rent.' },
    { id: 'store',  label: 'Things you store',        blurb: 'Where the library and the uploaded files actually live.' },
    { id: 'depend', label: 'Things you depend on',    blurb: 'Somebody else’s service. You call it; you do not run it.' },
    { id: 'flow',   label: 'Things the data flow needs', blurb: 'Never named in the component list. Your data flow cannot happen without them.' }
  ],

  /* ---- Where each thing runs (topology) ---------------------------------- */
  places: [
    { id: 'device', label: 'On the student’s device', note: 'Runs in the browser. Costs you nothing to run, and you cannot trust it with a secret.' },
    { id: 'yours',  label: 'On a machine you rent, running your code', note: 'You wrote it, so you can change it, move it, or delete it whenever you like.' },
    { id: 'theirs', label: 'On somebody else’s machine, running their code', note: 'You call it and pay for it. Convenient, and the source of every lock-in risk on this list.' }
  ],

  /* ---- THE RECOMMENDATIONS ----------------------------------------------
     order  — the architecture's own component order, then flow additions
     fit    — green | amber | red   (a technology keeps this colour everywhere)
     source — component | flow
     runs   — device | yours | theirs
     lockin — 1 (swap in an afternoon) … 5 (you are not really going to)
     ---------------------------------------------------------------------- */
  recs: [
    {
      id: 'react', order: 1, source: 'component', group: 'touch', phase: 1,
      component: 'Student Web App', tech: 'React + Vite', fit: 'amber',
      runs: 'device', lockin: 2,
      why: 'The most widely known way to build screens, paired with the fastest tool for turning them into a website — so when you get stuck, someone has already written the answer.',
      caveat: 'This builds a page that assembles itself in the browser, which means Google cannot read your curated topic pages. If students are meant to find you by searching “cardiovascular anatomy for pre-med”, you will need server rendering later.',
      prompt: 'Explain React with Vite to me like I’ve never built a website, using my Pre-Med Study Desk as the example — what would a topic page actually be made of?'
    },
    {
      id: 'tiptap', order: 2, source: 'component', group: 'touch', phase: 2,
      component: 'Curator Console', tech: 'TipTap', fit: 'amber',
      runs: 'device', lockin: 3,
      why: 'Your curators need to write real topic pages with headings, bold text and lists, and TipTap gives them a familiar writing box inside the app you are already building.',
      caveat: 'Save what they write as TipTap’s structured data, not as raw web code. Storing raw web code means you can never fully trust what gets displayed, and it is extremely painful to undo once you have 200 topic pages.',
      prompt: 'Show me how a curator would write a topic page in TipTap for my Pre-Med Study Desk, and explain exactly what gets saved to the database when they hit publish.'
    },
    {
      id: 'fastify', order: 3, source: 'component', group: 'write', phase: 1,
      component: 'Content API', tech: 'Fastify (TypeScript)', fit: 'green',
      runs: 'yours', lockin: 2,
      why: 'A small, fast server that checks every incoming request against a written rulebook before it reaches your code — which is precisely the job your architecture gives the Content API.',
      caveat: '',
      prompt: 'Explain what a Fastify server does, using my Pre-Med Study Desk’s Content API as the example — walk me through what happens when a student asks for the Cardiovascular topic.'
    },
    {
      id: 'zod', order: 4, source: 'component', group: 'write', phase: 1,
      component: 'Taxonomy Service — the Spine', tech: 'Zod', fit: 'red',
      runs: 'yours', lockin: 1, guarantor: true,
      why: 'Zod lets you write your body-system / discipline / level vocabulary down once, in one file, and refuse anything that does not match it — which is the entire day-one promise.',
      caveat: 'Your architecture calls the Spine a service; this recommends a library. A library only guards the code that remembers to call it. That is the right simplification at this size, but it is not automatic — you must also make the tags a real database link (a “foreign key”), so that even a script written at 2am physically cannot save an unknown tag. Do that in Phase 1 or the guarantee is only as strong as your memory.',
      prompt: 'Explain Zod to me like I’m not a programmer, and show me the Zod schema plus the database foreign key that together stop my Pre-Med Study Desk from ever saving a note with an invalid Spine tag.'
    },
    {
      id: 'postgres', order: 5, source: 'component', group: 'store', phase: 1,
      component: 'Library Database', tech: 'PostgreSQL', fit: 'green',
      runs: 'yours', lockin: 1,
      why: 'The one database that can hold topics, opportunities, notes and tags in separate tables and still answer “give me everything about the heart” in a single question — which is step 6 of your data flow, exactly.',
      caveat: '',
      prompt: 'Explain PostgreSQL to me like I’m new to databases, using my Pre-Med Study Desk as the example — what tables would I actually have for topics, opportunities, notes and tags?'
    },
    {
      id: 'r2', order: 6, source: 'component', group: 'store', phase: 3,
      component: 'Material Storage', tech: 'Cloudflare R2', fit: 'green',
      runs: 'theirs', lockin: 2,
      why: 'A cheap place to keep uploaded PDFs that — unlike almost every competitor — does not charge you every time a student re-opens the same lecture handout.',
      caveat: '',
      prompt: 'Explain Cloudflare R2 to me like I’ve never stored a file in the cloud, using my Pre-Med Study Desk’s uploaded lecture PDFs as the example.'
    },
    {
      id: 'clerk', order: 7, source: 'component', group: 'depend', phase: 3,
      component: 'Accounts and Sign-in', tech: 'Clerk', fit: 'red',
      runs: 'theirs', lockin: 5,
      why: 'Sign-in done properly is a security minefield, and Clerk hands you working accounts, email verification and student-versus-curator roles in an afternoon.',
      caveat: 'Three things stack up. Money: free to 10,000 active users, then it charges per active student — on a product students do not pay for. Minors: you would be handing the identities of possibly-15-year-olds to a third company, and your architecture already flags minors’ data protection as undesigned. Exit: this is the single hardest thing on this list to leave — everything else you can swap in a week, user accounts you cannot. And note your architecture’s own open question: if schools end up putting students here rather than students signing themselves up, this decision changes shape entirely.',
      prompt: 'Explain Clerk to me simply, and tell me honestly what I would have to think about — legally and practically — using it for under-18 students signing up to my Pre-Med Study Desk.'
    },
    {
      id: 'gha', order: 8, source: 'component', group: 'write', phase: 2,
      component: 'Opportunity Freshness Checker', tech: 'GitHub Actions scheduled workflow', fit: 'amber',
      runs: 'theirs', lockin: 1,
      why: 'A free nightly alarm clock that already lives next to your code, so the job that retires expired opportunities needs no extra server and no extra bill.',
      caveat: 'Two quirks. The alarm can go off late — sometimes by an hour when GitHub is busy — so never build anything that must run at exactly 3am. And GitHub switches these off automatically after 60 days with no activity in the repository, which is a very quiet way for your opportunity list to start rotting.',
      prompt: 'Explain GitHub Actions scheduled workflows to me from scratch, and write the nightly job that retires past-deadline opportunities in my Pre-Med Study Desk safely if it runs twice.'
    },
    {
      id: 'sdk', order: 9, source: 'component', group: 'write', phase: 4,
      component: 'PDF Filing Assistant', tech: '@anthropic-ai/sdk (tool use)', fit: 'amber',
      runs: 'yours', lockin: 2, ai: true,
      why: 'Anthropic’s official toolkit has a feature that forces the model to answer in a shape you define — so it can only pick tags from your Spine’s list, never invent one.',
      caveat: 'Your architecture knowingly skipped the job queue, so reading the PDF and asking the model both happen while the student waits. Test with a genuinely large handout early. When uploads routinely pass ~30 seconds, that deferred queue has become due.',
      prompt: 'Explain the Anthropic TypeScript SDK’s tool use to me simply, and show how my Pre-Med Study Desk’s PDF Filing Assistant would force Claude to choose only from my allowed Spine tag list.'
    },
    {
      id: 'haiku', order: 10, source: 'component', group: 'depend', phase: 4,
      component: 'Anthropic Claude API', tech: 'Claude Haiku 4.5', fit: 'amber',
      runs: 'theirs', lockin: 2, ai: true,
      why: 'The fastest and cheapest Claude model, and matching a document against a fixed list of tags is exactly the kind of job it is best at — you do not need a bigger one.',
      caveat: 'This is the first thing in the whole system that costs money every single time it is used. Cap how many PDFs one student can upload per day, or one enthusiastic user with a folder of 400 lecture decks becomes your largest bill.',
      prompt: 'Explain how Claude Haiku 4.5 is priced and how fast it is, and estimate what my Pre-Med Study Desk would spend if 200 students each upload 3 lecture PDFs a month.'
    },

    /* ---- from the data flow, never named in the component list ---------- */
    {
      id: 'pdfjs', order: 11, source: 'flow', group: 'flow', phase: 4,
      component: 'Pull the text out of an uploaded PDF', flowStep: 3,
      tech: 'pdfjs-dist (Mozilla’s PDF.js)', fit: 'amber',
      runs: 'yours', lockin: 1,
      why: 'The same PDF engine already inside Firefox and Chrome, which you can run on your server to turn a lecture handout into plain text for the Filing Assistant to read.',
      caveat: 'A scanned or photographed handout is a picture of a page, not text — this returns nothing at all for it. Reading those needs OCR, which your architecture does not include. Decide now what the student sees when extraction comes back empty; “pick your tags by hand” is a perfectly good answer, but it has to be a designed one.',
      prompt: 'Explain pdfjs-dist to me like I’ve never handled a PDF in code, show how my Pre-Med Study Desk would pull the text out of a 40-page lecture handout, and tell me what happens with a scanned one.'
    },
    {
      id: 'pdfview', order: 12, source: 'flow', group: 'flow', phase: 3,
      component: 'Show a stored PDF back to the student', flowStep: 6,
      tech: 'The browser’s own PDF viewer, via an iframe', fit: 'green',
      runs: 'device', lockin: 1,
      why: 'Every modern browser already ships a perfectly good PDF reader, so displaying a student’s uploaded handout is one line of code and zero new technology.',
      caveat: '',
      prompt: 'Show me the simplest way to display a stored PDF back to a student in my Pre-Med Study Desk using the browser’s own viewer, and explain what I give up by not adding a PDF library.'
    },
    {
      id: 'drizzle', order: 13, source: 'flow', group: 'flow', phase: 1,
      component: 'Let your code talk to those tables safely',
      tech: 'Drizzle ORM', fit: 'green',
      runs: 'yours', lockin: 2,
      why: 'It turns your database tables into something your code understands, so a typo in a tag column is caught while you are writing it rather than when a student hits save.',
      caveat: '',
      prompt: 'Explain Drizzle ORM to me like I’m new to databases, using my Pre-Med Study Desk’s topics, opportunities, notes and tags tables as the example.'
    },
    {
      id: 'fts', order: 14, source: 'flow', group: 'flow', phase: 1,
      component: 'Search inside the library', flowStep: 6,
      tech: 'PostgreSQL full-text search', fit: 'green',
      runs: 'yours', lockin: 1,
      why: 'Your database can already search text properly, so you get search for free without running a second system that has to be kept in step with the first.',
      caveat: '',
      prompt: 'Explain PostgreSQL full-text search to me simply, and write the one query that pulls the topic page, live opportunities and my own notes for Cardiovascular in my Pre-Med Study Desk.'
    },
    {
      id: 'pages', order: 15, source: 'flow', group: 'flow', phase: 1,
      component: 'Put the two screens on the internet',
      tech: 'Cloudflare Pages', fit: 'green',
      runs: 'theirs', lockin: 1,
      why: 'Free hosting for the student app and curator console, from the same company already holding your PDFs, with no server to think about.',
      caveat: '',
      prompt: 'Explain Cloudflare Pages to me like I’ve never deployed a website, and walk me through putting my Pre-Med Study Desk’s student app online for free.'
    },
    {
      id: 'railway', order: 16, source: 'flow', group: 'flow', phase: 1,
      component: 'Run the Content API somewhere',
      tech: 'Railway', fit: 'amber',
      runs: 'theirs', lockin: 2,
      why: 'The least fiddly way to get a server online — connect your code, press deploy, and it stays up without you learning anything about infrastructure.',
      caveat: 'There is no real free tier and you are billed for what you use, so a bug that loops forever bills forever. Set a spending cap on day one, before you deploy anything.',
      prompt: 'Explain Railway to me like I’ve never run a server, walk me through deploying my Pre-Med Study Desk’s Content API, and show me exactly where to set a spending cap.'
    },
    {
      id: 'neon', order: 17, source: 'flow', group: 'flow', phase: 1,
      component: 'Run PostgreSQL somewhere',
      tech: 'Neon', fit: 'amber',
      runs: 'theirs', lockin: 2,
      why: 'A hosted PostgreSQL with a genuinely free tier that costs nothing while nobody is using your app — which is most of the time in your first six months.',
      caveat: 'To be free, it goes to sleep when idle, so the first student of the morning waits about half a second longer than everyone else. Harmless here, but do not build a “we respond in 200ms” promise on top of it.',
      prompt: 'Explain Neon to me like I’m new to hosted databases, and tell me what actually happens to my Pre-Med Study Desk when nobody has used it for an hour.'
    }
  ],

  /* ---- What to learn first ----------------------------------------------- */
  learn: [
    { n: 1, recIds: ['postgres'], phase: 1, title: 'PostgreSQL',
      why: 'Everything else is a wrapper around the shape you choose here. Get the tag tables right and Phase 1 is most of the way done.' },
    { n: 2, recIds: ['drizzle'], phase: 1, title: 'Drizzle ORM',
      why: 'How your code reaches those tables without typos becoming bugs.' },
    { n: 3, recIds: ['zod'], phase: 1, title: 'Zod',
      why: 'The Spine itself, and the day-one promise. Learn it beside the foreign keys, not instead of them.' },
    { n: 4, recIds: ['fastify'], phase: 1, title: 'Fastify',
      why: 'The only door into the system. Once rungs 1–3 exist, this is mostly wiring.' },
    { n: 5, recIds: ['react', 'pages'], phase: 1, title: 'React + Vite, deployed to Cloudflare Pages',
      why: 'The first time you see a topic page. Learn deploying at the same time — a site nobody can open is not finished.' },
    { n: 6, recIds: ['tiptap'], phase: 2, title: 'TipTap',
      why: 'Only once curators actually need to write. Skip it entirely if you are seeding topic pages yourself.' },
    { n: 7, recIds: ['clerk', 'r2', 'pdfjs'], phase: 3, title: 'Clerk, then Cloudflare R2, then pdfjs-dist',
      why: 'Identity first, because a personal shelf is meaningless without knowing whose it is.' },
    { n: 8, recIds: ['sdk', 'haiku'], phase: 4, title: '@anthropic-ai/sdk with Claude Haiku 4.5',
      why: 'Last, deliberately, exactly as your architecture ordered it. Learning this first is the most common way this project stalls.' }
  ],
  learnNote: 'GitHub Actions, Railway and Neon are not really “learned” — you set each up once in an afternoon and rarely touch them again.',

  /* ---- Alternatives considered ------------------------------------------- */
  alternatives: [
    { chosenId: 'react', chosen: 'React + Vite', instead: 'Next.js',
      why: 'Server rendering would let Google find your topic pages — genuinely valuable, eventually. But it adds a whole rendering model for one person to hold in their head, for a benefit you cannot use until there is content worth finding.' },
    { chosenId: 'clerk', chosen: 'PostgreSQL + Clerk + R2 separately', instead: 'Supabase (all three in one)',
      why: 'One vendor, one bill, less juggling. Rejected because it puts your database, your files and minors’ identities behind a single account — and because leaving Supabase later means leaving all three at once. Revisit if three dashboards genuinely slow you down.' },
    { chosenId: 'clerk', chosen: 'Clerk', instead: 'Auth.js, self-hosted',
      why: 'Cheaper and no lock-in at all. Rejected because you would own password hashes and session security for minors on a part-time team. That is the bigger risk today, not the smaller one.' },
    { chosenId: 'fts', chosen: 'PostgreSQL full-text search', instead: 'Typesense or Elasticsearch',
      why: 'Your own architecture says Postgres covers you to ~50,000 items. You have zero. A search server now is a second database to keep in step with the first.' },
    { chosenId: 'fastify', chosen: 'Fastify', instead: 'Express',
      why: 'Express is more familiar and has more tutorials. Fastify wins because it checks requests against a schema at the door, which is exactly where the Spine belongs.' },
    { chosenId: 'tiptap', chosen: 'TipTap', instead: 'Plain Markdown files',
      why: 'If your curators are comfortable writing Markdown, drop TipTap entirely — it is the most over-built piece on this list if that turns out to be true.' },
    { chosenId: 'gha', chosen: 'GitHub Actions cron', instead: 'pg_cron inside PostgreSQL',
      why: 'Elegant: the nightly sweep is one SQL statement, so it needs no app at all. Rejected because it depends on your database host offering it, and Neon’s free tier suspends when idle.' },
    { chosenId: 'pdfjs', chosen: 'pdfjs-dist', instead: 'unpdf',
      why: 'A friendlier wrapper over the same Mozilla engine. Either is fine; pdfjs-dist is the one with a decade of use behind it. Swapping is a one-file change.' },
    { chosenId: 'r2', chosen: 'Cloudflare R2', instead: 'Amazon S3',
      why: 'S3 charges for every byte a student downloads, and students re-open the same PDFs repeatedly. R2 charges nothing for that.' },
    { chosenId: 'neon', chosen: 'Neon + Railway', instead: 'Railway for both',
      why: 'One dashboard instead of two, about $5/month more. You would lose Neon’s free tier and the ability to branch your database like code. A reasonable trade if two bills annoy you more than the money.' }
  ],

  /* ---- Lock-in ----------------------------------------------------------- */
  lockinScale: [
    { n: 1, label: 'Swap it in an afternoon' },
    { n: 2, label: 'A weekend, at most' },
    { n: 3, label: 'A scripting job, not a config change' },
    { n: 4, label: 'A project in its own right' },
    { n: 5, label: 'You are not really going to' }
  ],
  lockinNotes: [
    { recId: 'clerk', note: 'Your users’ accounts, sessions and password hashes live there, not with you. Moving means every student re-registers. This is the one to think about now.' },
    { recId: 'tiptap', note: 'Your topic pages get stored in its own document shape. Converting 200 pages later is a scripting job, not a config change.' },
    { recId: 'r2', note: 'Speaks the same language as Amazon S3, so moving is mostly a copy job.' },
    { recId: 'neon', note: 'It is just PostgreSQL. Your data comes out with one command.' },
    { recId: 'railway', note: 'Your API is a container. Anyone can run a container.' },
    { recId: 'postgres', note: 'Rated 1 not because you would leave it, but because your data comes out cleanly if you did.' }
  ],
  lockinPattern: 'Everything you write is cheap to change. Everything you rent is not. Clerk is the only 4-or-5 on the entire list.',

  /* ---- Cost -------------------------------------------------------------- */
  cost: {
    rows: [
      { item: 'Cloudflare Pages', day1: '$0', later: '$0', note: 'Free at this size, comfortably' },
      { item: 'Neon (PostgreSQL)', day1: '$0', later: '~$19/mo', note: 'Free tier sleeps when idle' },
      { item: 'Railway (Content API)', day1: '~$5', later: '~$10–20/mo', note: 'Billed by use — set a cap' },
      { item: 'Cloudflare R2 (PDFs)', day1: '$0', later: '~$1–5/mo', note: '10 GB free, no download charges' },
      { item: 'Clerk (accounts)', day1: '$0', later: '~$25/mo and up', note: 'Free to 10,000 active users' },
      { item: 'Claude Haiku 4.5', day1: '~$1', later: '~$3–10/mo', note: 'Pennies per upload, pay per use' },
      { item: 'GitHub Actions', day1: '$0', later: '$0', note: 'Free minutes cover a nightly job easily' }
    ],
    day1: 'Roughly $5–10 a month.',
    later: 'At around 1,000 active students who upload: roughly $30–60 a month — and Clerk plus Railway are most of it.',
    caveat: 'These are estimates from published pricing, not quotes. Check each before you rely on the number: provider pricing changes faster than this document does.'
  },

  /* ---- What to build first ----------------------------------------------- */
  buildFirst: [
    { n: 1, what: 'PostgreSQL on Neon, with the tag tables and their foreign keys', why: 'Nothing else until the vocabulary is real and the database physically refuses an unknown tag.' },
    { n: 2, what: 'Fastify + Drizzle + Zod — the write path only', why: 'Prove you cannot save a topic without valid tags. That is Phase 1’s whole point.' },
    { n: 3, what: 'React + Vite on Cloudflare Pages, showing topic pages', why: 'The first thing a person can look at.' },
    { n: 4, what: 'Set the Railway spending cap', why: 'Before you deploy anything that could loop.' }
  ],

  /* ---- Least confident --------------------------------------------------- */
  confidence: [
    {
      recId: 'clerk', rank: 1, direction: 'unsure',
      title: 'Clerk — the least confident call on this list',
      note: 'Your architecture’s own open question is “is a student here on their own, or is a school putting them here?” That question decides this row. Self-serve students → Clerk is right. Schools with rosters → you need organisations, cohorts and possibly school SSO, and the answer may not be Clerk at all. This recommends an identity provider before the identity question is settled. Answer that question first, then come back and re-read this row.'
    },
    {
      recId: 'railway', rank: 2, direction: 'unsure',
      title: 'Railway versus Fly.io versus Render',
      note: 'Genuinely close. Railway wins on friendliness, not because your architecture demands it. Nothing in your design would look different under the other two — this is taste and budget, and you should feel free to overrule it.'
    },
    {
      recId: 'tiptap', rank: 3, direction: 'unsure',
      title: 'TipTap assumes curators want a rich writing experience',
      note: 'If your curator is one technical person seeding Markdown files, TipTap is dead weight and this has added a dependency you do not need. The architecture does not say which is true.'
    },
    {
      recId: 'pdfjs', rank: 4, direction: 'under-rated',
      title: 'pdfjs-dist at 🟡 could reasonably be 🔴',
      note: '“Scanned handouts return nothing” is not a small caveat for a tool aimed at students photographing lecture slides. It stayed 🟡 only because your design already lets the student tag by hand — the fallback exists. If that fallback turns out to be the common path rather than the rare one, Phase 4 is not worth building as designed.'
    }
  ],

  /* ---- What this does NOT tell you --------------------------------------- */
  notCovered: [
    { area: 'What this costs at 10,000 students', note: 'The day-one figure is reliable; the growth curve is not modelled, and Clerk’s is the one that bends sharply.' },
    { area: 'Whether the Spine’s three axes are the right axes', note: 'No technology answers that. Only Phase 1 does.' },
    { area: 'Minors’ consent, data retention or export rights', note: 'A legal question, not a stack question — and your architecture already flags it as undesigned.' },
    { area: 'OCR for scanned handouts', note: 'Not chosen, not costed, not in your architecture.' },
    { area: 'Medical accuracy review', note: 'Still a person’s job. No tool on this list checks whether a topic page is correct.' },
    { area: 'Testing, CI, or a deployment pipeline', note: 'Beyond the nightly job, none of it is specified here.' },
    { area: 'Accessibility tooling', note: 'Assumed as a build standard, not specified.' },
    { area: 'Version numbers', note: 'These move faster than this document. Install the current release of each and check its own docs.' },
    { area: 'Whether school-mediated signup flips the Clerk decision', note: 'It probably does. See “where I am least confident”.' }
  ],

  /* ---- Coverage against the architecture --------------------------------- */
  /* every component named in project-blueprint/architecture.md, in its order  */
  architectureComponents: [
    { name: 'Student Web App', recId: 'react' },
    { name: 'Curator Console', recId: 'tiptap' },
    { name: 'Content API', recId: 'fastify' },
    { name: 'Taxonomy Service (the Spine)', recId: 'zod' },
    { name: 'Library Database', recId: 'postgres' },
    { name: 'Material Storage', recId: 'r2' },
    { name: 'Accounts and Sign-in', recId: 'clerk' },
    { name: 'Opportunity Freshness Checker', recId: 'gha' },
    { name: 'PDF Filing Assistant', recId: 'sdk' },
    { name: 'Anthropic Claude API', recId: 'haiku' }
  ],

  /* ---- Sections ---------------------------------------------------------- */
  sections: [
    {
      id: 'summary', num: '01', nav: 'Summary', file: '01-summary.html',
      name: 'The Headline', preview: 'bands',
      blurb: 'What the ratings mean, what they are measured against, and the two places this stack is most likely to hurt.',
      count: function (S) { return S.recs.length + ' recommendations'; }
    },
    {
      id: 'picks', num: '02', nav: 'Picks', file: '02-picks.html',
      name: 'The Recommendations', preview: 'groups',
      blurb: 'One real technology per component, grouped by what kind of thing it is, in your architecture’s own order.',
      count: function (S) {
        var comp = S.recs.filter(function (r) { return r.source === 'component'; }).length;
        return comp + ' components + ' + (S.recs.length - comp) + ' from the flow';
      }
    },
    {
      id: 'watch', num: '03', nav: 'Watch', file: '03-watch-outs.html',
      name: 'Watch-outs', preview: 'ratio',
      blurb: 'Every caveat in one place, reds first — and an honest note on which calls are least confident.',
      count: function (S) { return S.recs.filter(function (r) { return r.fit === 'red'; }).length + ' to watch'; }
    },
    {
      id: 'prompts', num: '04', nav: 'Prompts', file: '04-prompts.html',
      name: 'Copy-Ready Prompts', preview: 'cards',
      blurb: 'One pasteable prompt per technology, each already naming your project so the answer comes back concrete.',
      count: function (S) { return S.recs.length + ' prompts to copy'; }
    },
    {
      id: 'learn', num: '05', nav: 'Learn', file: '05-learn-first.html',
      name: 'What to Learn First', preview: 'ladder',
      blurb: 'The order to pick these up in, following your own build phases rather than your curiosity.',
      count: function (S) { return S.learn.length + ' rungs, in order'; }
    },
    {
      id: 'options', num: '06', nav: 'Options', file: '06-alternatives.html',
      name: 'Alternatives Considered', preview: 'alts',
      blurb: 'What else was on the table for each pick, and the specific reason it lost.',
      count: function (S) { return S.alternatives.length + ' roads not taken'; }
    },
    {
      id: 'lockin', num: '07', nav: 'Lock-in', file: '07-lock-in.html',
      name: 'How Hard to Undo', preview: 'lockin',
      blurb: 'Every decision scored 1 to 5 on how painful it would be to reverse, so you know which ones are actually decisions.',
      count: function (S) {
        var n = S.recs.filter(function (r) { return r.lockin >= 4; }).length;
        return n + ' hard to reverse';
      }
    },
    {
      id: 'appendix', num: '08', nav: 'Notes', file: '08-appendix.html',
      name: 'Costs & Limits', preview: 'coverage',
      blurb: 'What it costs a month, what to build first, coverage against the architecture, and what this document does not tell you.',
      count: function (S) { return S.notCovered.length + ' things not covered'; }
    }
  ]
};